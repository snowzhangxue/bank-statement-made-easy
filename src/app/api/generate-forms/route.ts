import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTax } from "@/lib/tax-engine/calculator";
import { mapTo1040Fields, determineRequiredForms } from "@/lib/tax-engine/form-mapper";
import { fillPdfForm, getFormName } from "@/lib/tax-engine/pdf-filler";
import * as path from "path";

export async function GET() {
  try {
    const taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      return NextResponse.json({ forms: [] });
    }

    const forms = await prisma.generatedForm.findMany({
      where: { taxReturnId: taxReturn.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list forms" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      return NextResponse.json({ error: "No tax return found" }, { status: 404 });
    }

    // Get all items with categories
    const items = await prisma.extractedItem.findMany({
      where: { taxReturnId: taxReturn.id },
      include: { category: true },
    });

    // Build category totals
    const categoryMap = new Map<
      string,
      { categoryName: string; type: string; formLine: string; total: number }
    >();

    for (const item of items) {
      if (!item.category) continue;
      const key = item.category.id;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += item.amount;
      } else {
        categoryMap.set(key, {
          categoryName: item.category.name,
          type: item.category.type,
          formLine: item.category.formLine,
          total: item.amount,
        });
      }
    }

    const categoryTotals = Array.from(categoryMap.values());

    // Calculate tax
    const summary = calculateTax(taxReturn.filingStatus, categoryTotals);

    // Determine required forms
    const requiredForms = determineRequiredForms(categoryTotals);

    // Map fields for 1040
    const personalInfo = {
      firstName: taxReturn.firstName,
      lastName: taxReturn.lastName,
      ssn: taxReturn.ssn,
      address: taxReturn.address,
      city: taxReturn.city,
      state: taxReturn.state,
      zip: taxReturn.zip,
      filingStatus: taxReturn.filingStatus,
    };

    const form1040Fields = mapTo1040Fields(personalInfo, summary, categoryTotals);

    // Delete old generated forms for this tax return
    await prisma.generatedForm.deleteMany({
      where: { taxReturnId: taxReturn.id },
    });

    const generatedForms = [];
    const outputDir = path.join(process.cwd(), "public", "generated");

    for (const formType of requiredForms) {
      const fileName = `${formType}-${taxReturn.id}.pdf`;
      const outputPath = path.join(outputDir, fileName);
      const publicPath = `/generated/${fileName}`;

      // Use 1040 fields for 1040, empty for others (placeholder)
      const fields = formType === "1040" ? form1040Fields : [];

      const result = await fillPdfForm(formType, fields, outputPath);

      const form = await prisma.generatedForm.create({
        data: {
          taxReturnId: taxReturn.id,
          formType,
          formName: getFormName(formType),
          filePath: publicPath,
          fieldData: JSON.stringify(fields),
        },
      });

      generatedForms.push({
        ...form,
        fillResult: result,
      });
    }

    return NextResponse.json({
      forms: generatedForms,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate forms" },
      { status: 500 }
    );
  }
}
