// Rule-based categorization for known document types

interface CategorizeResult {
  categoryName: string;
  confidence: number;
}

// W-2 box mappings to categories
const W2_BOX_MAP: Record<string, CategorizeResult> = {
  "1": { categoryName: "wages_salaries", confidence: 0.99 },
  "2": { categoryName: "federal_tax_withheld", confidence: 0.99 },
  "3": { categoryName: "wages_salaries", confidence: 0.95 }, // SS wages (info only)
  "4": { categoryName: "social_security_withheld", confidence: 0.99 },
  "5": { categoryName: "wages_salaries", confidence: 0.95 }, // Medicare wages (info only)
  "6": { categoryName: "medicare_withheld", confidence: 0.99 },
  "16": { categoryName: "state_local_taxes", confidence: 0.90 },
  "17": { categoryName: "state_local_taxes", confidence: 0.95 },
};

// 1099 form mappings
const FORM_1099_MAP: Record<string, Record<string, CategorizeResult>> = {
  INT: {
    "1": { categoryName: "taxable_interest", confidence: 0.99 },
    "3": { categoryName: "tax_exempt_interest", confidence: 0.99 },
    "4": { categoryName: "federal_tax_withheld", confidence: 0.95 },
  },
  DIV: {
    "1a": { categoryName: "ordinary_dividends", confidence: 0.99 },
    "1b": { categoryName: "qualified_dividends", confidence: 0.99 },
    "4": { categoryName: "federal_tax_withheld", confidence: 0.95 },
  },
  MISC: {
    "1": { categoryName: "other_income", confidence: 0.80 },
    "3": { categoryName: "other_income", confidence: 0.80 },
  },
  NEC: {
    "1": { categoryName: "business_income", confidence: 0.90 },
    "4": { categoryName: "federal_tax_withheld", confidence: 0.95 },
  },
  B: {
    proceeds: { categoryName: "capital_gains", confidence: 0.90 },
  },
};

// Keyword-based categorization for transaction descriptions
const KEYWORD_RULES: Array<{ keywords: string[]; category: CategorizeResult }> = [
  { keywords: ["salary", "payroll", "direct deposit", "wages"], category: { categoryName: "wages_salaries", confidence: 0.80 } },
  { keywords: ["interest earned", "interest payment", "savings interest"], category: { categoryName: "taxable_interest", confidence: 0.75 } },
  { keywords: ["dividend", "div payment"], category: { categoryName: "ordinary_dividends", confidence: 0.75 } },
  { keywords: ["federal tax", "irs", "us treasury"], category: { categoryName: "estimated_tax_payments", confidence: 0.70 } },
  { keywords: ["mortgage", "home loan"], category: { categoryName: "mortgage_interest", confidence: 0.70 } },
  { keywords: ["property tax", "real estate tax", "county tax"], category: { categoryName: "real_estate_taxes", confidence: 0.75 } },
  { keywords: ["doctor", "hospital", "medical", "pharmacy", "dental", "health"], category: { categoryName: "medical_expenses", confidence: 0.70 } },
  { keywords: ["charity", "donation", "red cross", "united way", "nonprofit"], category: { categoryName: "charitable_cash", confidence: 0.70 } },
  { keywords: ["office supplies", "staples", "office depot"], category: { categoryName: "business_office_expense", confidence: 0.60 } },
  { keywords: ["gas station", "fuel", "uber", "lyft", "car rental"], category: { categoryName: "business_car_expenses", confidence: 0.50 } },
  { keywords: ["airline", "hotel", "airbnb", "flight", "travel"], category: { categoryName: "business_travel", confidence: 0.50 } },
  { keywords: ["restaurant", "dining", "lunch", "dinner", "food"], category: { categoryName: "business_meals", confidence: 0.45 } },
  { keywords: ["internet", "phone", "electric", "water", "utility"], category: { categoryName: "business_utilities", confidence: 0.40 } },
  { keywords: ["insurance premium", "business insurance"], category: { categoryName: "business_insurance", confidence: 0.60 } },
  { keywords: ["advertising", "google ads", "facebook ads", "marketing"], category: { categoryName: "business_advertising", confidence: 0.70 } },
  { keywords: ["student loan"], category: { categoryName: "student_loan_interest", confidence: 0.75 } },
  { keywords: ["hsa", "health savings"], category: { categoryName: "hsa_deduction", confidence: 0.80 } },
  { keywords: ["ira contribution", "retirement contribution"], category: { categoryName: "ira_deduction", confidence: 0.70 } },
];

export function categorizeW2Item(box: string): CategorizeResult | null {
  // Skip boxes 3, 5 as they duplicate wages info
  if (box === "3" || box === "5") return null;
  return W2_BOX_MAP[box] ?? null;
}

export function categorize1099Item(formVariant: string, box: string): CategorizeResult | null {
  const variant = FORM_1099_MAP[formVariant.toUpperCase()];
  if (!variant) return null;
  return variant[box] ?? null;
}

export function categorizeByKeywords(description: string): CategorizeResult | null {
  const lower = description.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return null;
}
