export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const TAX_YEAR = 2024;

export const TAX_BRACKETS: Record<string, TaxBracket[]> = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  married_separate: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

export const STANDARD_DEDUCTION: Record<string, number> = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_of_household: 21900,
};

export const FILING_STATUS_LABELS: Record<string, string> = {
  single: "Single",
  married_joint: "Married Filing Jointly",
  married_separate: "Married Filing Separately",
  head_of_household: "Head of Household",
};

export interface TaxSummary {
  totalIncome: number;
  adjustments: number;
  agi: number;
  standardDeduction: number;
  itemizedDeduction: number;
  deductionUsed: "standard" | "itemized";
  deductionAmount: number;
  taxableIncome: number;
  taxBeforeCredits: number;
  totalCredits: number;
  taxAfterCredits: number;
  totalWithholdings: number;
  totalPayments: number;
  refundOrOwed: number; // positive = refund, negative = owed
  effectiveRate: number;
  bracketBreakdown: Array<{ rate: number; amount: number; tax: number }>;
}

export interface W2ParseResult {
  docType: "w2";
  employer: { name: string; ein: string; address: string };
  employee: { name: string; ssn: string; address: string };
  items: Array<{ box: string; description: string; amount: number }>;
}

export interface BankStatementParseResult {
  docType: "bank_statement";
  bank: string;
  accountType: string;
  period: { start: string; end: string };
  items: Array<{ date: string; description: string; amount: number; type: string }>;
}

export interface ReceiptParseResult {
  docType: "receipt";
  vendor: string;
  date: string;
  items: Array<{ description: string; amount: number; category_hint: string }>;
  total: number;
}

export type ParseResult = W2ParseResult | BankStatementParseResult | ReceiptParseResult | {
  docType: string;
  items: Array<{ description: string; amount: number; [key: string]: unknown }>;
};
