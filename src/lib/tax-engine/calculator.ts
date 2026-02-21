import { TAX_BRACKETS, STANDARD_DEDUCTION, type TaxSummary, type TaxBracket } from "@/types/tax";

interface CategoryTotal {
  categoryName: string;
  type: string;
  total: number;
}

function calculateBracketTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): { total: number; breakdown: Array<{ rate: number; amount: number; tax: number }> } {
  let remaining = taxableIncome;
  let total = 0;
  const breakdown: Array<{ rate: number; amount: number; tax: number }> = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
    const tax = taxableInBracket * bracket.rate;
    total += tax;
    breakdown.push({ rate: bracket.rate, amount: taxableInBracket, tax });
    remaining -= taxableInBracket;
  }

  return { total, breakdown };
}

export function calculateTax(
  filingStatus: string,
  categoryTotals: CategoryTotal[]
): TaxSummary {
  const brackets = TAX_BRACKETS[filingStatus] || TAX_BRACKETS.single;
  const stdDeduction = STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single;

  // Sum by type
  const sumByType = (type: string) =>
    categoryTotals
      .filter((c) => c.type === type)
      .reduce((sum, c) => sum + c.total, 0);

  const totalIncome = sumByType("income");
  const totalDeductions = sumByType("deduction");
  const totalCredits = sumByType("credit");
  const totalWithholdings = sumByType("withholding");

  // Above-the-line adjustments (educator, HSA, IRA, student loan, self-employment tax deduction)
  const aboveLineCategories = [
    "educator_expenses",
    "hsa_deduction",
    "self_employment_tax_deduction",
    "ira_deduction",
    "student_loan_interest",
  ];
  const adjustments = categoryTotals
    .filter((c) => aboveLineCategories.includes(c.categoryName))
    .reduce((sum, c) => sum + c.total, 0);

  // Below-the-line (itemized) deductions
  const belowLineDeductions = totalDeductions - adjustments;

  const agi = Math.max(0, totalIncome - adjustments);

  // Compare standard vs itemized
  const deductionUsed: "standard" | "itemized" =
    belowLineDeductions > stdDeduction ? "itemized" : "standard";
  const deductionAmount =
    deductionUsed === "itemized" ? belowLineDeductions : stdDeduction;

  const taxableIncome = Math.max(0, agi - deductionAmount);

  const { total: taxBeforeCredits, breakdown: bracketBreakdown } =
    calculateBracketTax(taxableIncome, brackets);

  const taxAfterCredits = Math.max(0, taxBeforeCredits - totalCredits);

  const refundOrOwed = totalWithholdings - taxAfterCredits;

  const effectiveRate = totalIncome > 0 ? taxAfterCredits / totalIncome : 0;

  return {
    totalIncome,
    adjustments,
    agi,
    standardDeduction: stdDeduction,
    itemizedDeduction: belowLineDeductions,
    deductionUsed,
    deductionAmount,
    taxableIncome,
    taxBeforeCredits,
    totalCredits,
    taxAfterCredits,
    totalWithholdings,
    totalPayments: totalWithholdings,
    refundOrOwed,
    effectiveRate,
    bracketBreakdown,
  };
}
