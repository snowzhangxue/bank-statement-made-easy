import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.extractedItem.findMany({
      include: {
        category: true,
        document: { select: { id: true, fileName: true, docType: true, bankName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list items" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, categoryId, amount, description, verified } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const item = await prisma.extractedItem.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(verified !== undefined && { verified }),
      },
      include: { category: true },
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 }
    );
  }
}
