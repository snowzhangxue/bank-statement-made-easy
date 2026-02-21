import type { TaxSummary } from "@/types/tax";

export interface FormFieldMapping {
  fieldName: string;
  value: string | number;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  filingStatus: string;
}

interface CategoryTotal {
  categoryName: string;
  formLine: string;
  type: string;
  total: number;
}

export function mapTo1040Fields(
  personal: PersonalInfo,
  summary: TaxSummary,
  categoryTotals: CategoryTotal[]
): FormFieldMapping[] {
  const fields: FormFieldMapping[] = [];

  const add = (name: string, value: string | number) => {
    if (value !== "" && value !== 0) {
      fields.push({ fieldName: name, value });
    }
  };

  // Personal info
  add("f1_01", personal.firstName);
  add("f1_02", personal.lastName);
  add("f1_03", personal.ssn);
  add("f1_04", personal.address);
  add("f1_05", `${personal.city}, ${personal.state} ${personal.zip}`);

  // Filing status checkboxes
  const statusMap: Record<string, string> = {
    single: "c1_01",
    married_joint: "c1_02",
    married_separate: "c1_03",
    head_of_household: "c1_04",
  };
  if (statusMap[personal.filingStatus]) {
    add(statusMap[personal.filingStatus], "Yes");
  }

  // Income lines
  const findTotal = (name: string) =>
    categoryTotals.find((c) => c.categoryName === name)?.total ?? 0;

  add("f1_06", findTotal("wages_salaries")); // Line 1a
  add("f1_07", findTotal("tax_exempt_interest")); // Line 2a
  add("f1_08", findTotal("taxable_interest")); // Line 2b
  add("f1_09", findTotal("qualified_dividends")); // Line 3a
  add("f1_10", findTotal("ordinary_dividends")); // Line 3b
  add("f1_14", findTotal("capital_gains")); // Line 7
  add("f1_15", findTotal("other_income") + findTotal("business_income")); // Line 8

  // Total income
  add("f1_16", summary.totalIncome); // Line 9

  // Adjustments
  add("f1_17", summary.adjustments); // Line 10

  // AGI
  add("f1_18", summary.agi); // Line 11

  // Deduction
  add("f1_19", summary.deductionAmount); // Line 12/13

  // Taxable income
  add("f1_21", summary.taxableIncome); // Line 15

  // Tax
  add("f1_22", summary.taxBeforeCredits); // Line 16

  // Credits
  add("f1_25", summary.totalCredits); // Line 21

  // Tax after credits
  add("f1_28", summary.taxAfterCredits); // Line 24

  // Withholdings
  add("f1_32", summary.totalWithholdings); // Line 25a
  add("f1_36", summary.totalPayments); // Line 33

  // Refund or owed
  if (summary.refundOrOwed > 0) {
    add("f1_37", summary.refundOrOwed); // Line 34 (refund)
  } else if (summary.refundOrOwed < 0) {
    add("f1_39", Math.abs(summary.refundOrOwed)); // Line 37 (amount owed)
  }

  return fields;
}

export function determineRequiredForms(categoryTotals: CategoryTotal[]): string[] {
  const forms = ["1040"]; // Always need 1040

  const hasItemized = categoryTotals.some(
    (c) => c.formLine.startsWith("schedA_") && c.total > 0
  );
  if (hasItemized) forms.push("schedA");

  const interestDividends =
    (categoryTotals.find((c) => c.categoryName === "taxable_interest")?.total ?? 0) +
    (categoryTotals.find((c) => c.categoryName === "ordinary_dividends")?.total ?? 0);
  if (interestDividends > 1500) forms.push("schedB");

  const hasBusiness = categoryTotals.some(
    (c) => c.formLine.startsWith("schedC_") && c.total > 0
  );
  const hasBusinessIncome =
    (categoryTotals.find((c) => c.categoryName === "business_income")?.total ?? 0) > 0;
  if (hasBusiness || hasBusinessIncome) forms.push("schedC");

  const hasCapGains =
    (categoryTotals.find((c) => c.categoryName === "capital_gains")?.total ?? 0) !== 0;
  if (hasCapGains) forms.push("schedD");

  return forms;
}
