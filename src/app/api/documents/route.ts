import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    const taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      return NextResponse.json({ documents: [] });
    }

    const documents = await prisma.document.findMany({
      where: { taxReturnId: taxReturn.id },
      include: { _count: { select: { extractedItems: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      taxReturn = await prisma.taxReturn.create({ data: {} });
    }

    // Determine file type
    const ext = path.extname(file.name).toLowerCase();
    let fileType = "unknown";
    let docType = "unknown";
    if (ext === ".pdf") {
      fileType = "pdf";
    } else if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      fileType = "image";
    } else if (ext === ".csv") {
      fileType = "csv";
      docType = "csv";
    }

    // Save file to uploads/
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const document = await prisma.document.create({
      data: {
        taxReturnId: taxReturn.id,
        fileName: file.name,
        fileType,
        filePath,
        fileSize: buffer.length,
        docType,
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: 500 }
    );
  }
}
