import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDocumentWithClaude } from "@/lib/claude";
import { categorizeW2Item, categorizeByKeywords, categorize1099Item } from "@/lib/categorization/rules";
import { parseCsvTransactions } from "@/lib/parsing/csv-parser";
import * as fs from "fs";
import * as path from "path";

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete old extracted items if re-parsing
    await prisma.extractedItem.deleteMany({ where: { documentId } });

    // Mark as parsing
    await prisma.document.update({
      where: { id: documentId },
      data: { parseStatus: "parsing", bankName: null, rawResult: null, errorMsg: null },
    });

    // Load all categories for matching
    const categories = await prisma.taxCategory.findMany();
    const findCategoryId = (name: string) =>
      categories.find((c) => c.name === name)?.id ?? null;

    let extractedItems: Array<{
      description: string;
      amount: number;
      confidence: number;
      categoryId: string | null;
      rawData: string | null;
    }> = [];

    if (document.fileType === "csv") {
      // CSV parsing
      const csvContent = fs.readFileSync(document.filePath, "utf-8");
      const transactions = parseCsvTransactions(csvContent);

      for (const tx of transactions) {
        const rule = categorizeByKeywords(tx.description);
        extractedItems.push({
          description: tx.description,
          amount: tx.amount,
          confidence: rule?.confidence ?? 0,
          categoryId: rule ? findCategoryId(rule.categoryName) : null,
          rawData: JSON.stringify(tx),
        });
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { docType: "csv", rawResult: JSON.stringify(transactions) },
      });
    } else {
      // Image/PDF parsing with Claude
      const fileBuffer = fs.readFileSync(document.filePath);
      const base64Content = fileBuffer.toString("base64");

      const ext = path.extname(document.fileName).toLowerCase();
      let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";
      if (ext === ".pdf") mediaType = "application/pdf";
      else if (ext === ".png") mediaType = "image/png";
      else if (ext === ".webp") mediaType = "image/webp";
      else if (ext === ".gif") mediaType = "image/gif";
      else mediaType = "image/jpeg";

      const rawResponse = await parseDocumentWithClaude(
        base64Content,
        mediaType,
        document.docType !== "unknown" ? document.docType : undefined,
        document.fileName
      );

      // Parse JSON from Claude response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        await prisma.document.update({
          where: { id: documentId },
          data: { parseStatus: "error", errorMsg: "Could not parse AI response as JSON" },
        });
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const docType = parsed.docType || "unknown";
      const bankName = parsed.source_name || parsed.bank || parsed.employer?.name || parsed.payer || null;

      await prisma.document.update({
        where: { id: documentId },
        data: { docType, rawResult: rawResponse, bankName },
      });

      const items = parsed.items || [];

      for (const item of items) {
        let rule = null;

        if (docType === "w2" && item.box) {
          rule = categorizeW2Item(item.box);
        } else if (docType === "1099" && parsed.form_variant && item.box) {
          rule = categorize1099Item(parsed.form_variant, item.box);
        }

        if (!rule) {
          rule = categorizeByKeywords(item.description || "");
        }

        // Skip items with zero amount
        if (!item.amount || item.amount === 0) continue;
        // Skip W2 boxes 3 and 5 (duplicate wage info)
        if (docType === "w2" && (item.box === "3" || item.box === "5")) continue;

        extractedItems.push({
          description: item.description || `${docType} item`,
          amount: typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0,
          confidence: rule?.confidence ?? 0,
          categoryId: rule ? findCategoryId(rule.categoryName) : null,
          rawData: JSON.stringify(item),
        });
      }
    }

    // Create extracted items in DB
    const created = await Promise.all(
      extractedItems.map((item) =>
        prisma.extractedItem.create({
          data: {
            taxReturnId: document.taxReturnId,
            documentId: document.id,
            description: item.description,
            amount: item.amount,
            confidence: item.confidence,
            categoryId: item.categoryId,
            rawData: item.rawData,
          },
        })
      )
    );

    // Mark as parsed
    await prisma.document.update({
      where: { id: documentId },
      data: { parseStatus: "parsed" },
    });

    return NextResponse.json({
      document: { id: documentId, parseStatus: "parsed" },
      itemCount: created.length,
      items: created,
    });
  } catch (error) {
    // Update document status to error - documentId was parsed at start of try block
    try {
      const bodyText = await request.text().catch(() => "");
      let docId: string | undefined;
      try { docId = JSON.parse(bodyText).documentId; } catch { /* already consumed */ }
      // Fall back: find any document currently in "parsing" status
      if (!docId) {
        const parsingDoc = await prisma.document.findFirst({ where: { parseStatus: "parsing" } });
        docId = parsingDoc?.id;
      }
      if (docId) {
        await prisma.document.update({
          where: { id: docId },
          data: {
            parseStatus: "error",
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse document" },
      { status: 500 }
    );
  }
}
