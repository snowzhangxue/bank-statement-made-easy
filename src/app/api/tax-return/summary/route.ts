import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTax } from "@/lib/tax-engine/calculator";

export async function GET() {
  try {
    const taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      return NextResponse.json({ error: "No tax return found" }, { status: 404 });
    }

    const items = await prisma.extractedItem.findMany({
      where: { taxReturnId: taxReturn.id },
      include: { category: true },
    });

    // Group by category
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
    const summary = calculateTax(taxReturn.filingStatus, categoryTotals);

    return NextResponse.json({ summary, categoryTotals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate summary" },
      { status: 500 }
    );
  }
}
