import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    let taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      taxReturn = await prisma.taxReturn.create({ data: {} });
    }
    return NextResponse.json({ taxReturn });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get tax return" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { filingStatus, firstName, lastName, ssn, address, city, state, zip } = body;

    let taxReturn = await prisma.taxReturn.findFirst();
    if (!taxReturn) {
      taxReturn = await prisma.taxReturn.create({ data: {} });
    }

    taxReturn = await prisma.taxReturn.update({
      where: { id: taxReturn.id },
      data: {
        ...(filingStatus !== undefined && { filingStatus }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(ssn !== undefined && { ssn }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
      },
    });

    return NextResponse.json({ taxReturn });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update tax return" },
      { status: 500 }
    );
  }
}
