import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const categories = [
  // Income
  { name: "wages_salaries", description: "Wages, salaries, tips (W-2)", formLine: "1040_line1a", type: "income", sortOrder: 1 },
  { name: "household_employee_wages", description: "Household employee wages not on W-2", formLine: "1040_line1b", type: "income", sortOrder: 2 },
  { name: "tip_income", description: "Tip income not on W-2", formLine: "1040_line1c", type: "income", sortOrder: 3 },
  { name: "dependent_care_benefits", description: "Taxable dependent care benefits", formLine: "1040_line1d", type: "income", sortOrder: 4 },
  { name: "employer_adoption_benefits", description: "Employer-provided adoption benefits", formLine: "1040_line1e", type: "income", sortOrder: 5 },
  { name: "scholarship_income", description: "Taxable scholarship/fellowship grants", formLine: "1040_line1f", type: "income", sortOrder: 6 },
  { name: "tax_exempt_interest", description: "Tax-exempt interest", formLine: "1040_line2a", type: "income", sortOrder: 7 },
  { name: "taxable_interest", description: "Taxable interest", formLine: "1040_line2b", type: "income", sortOrder: 8 },
  { name: "qualified_dividends", description: "Qualified dividends", formLine: "1040_line3a", type: "income", sortOrder: 9 },
  { name: "ordinary_dividends", description: "Ordinary dividends", formLine: "1040_line3b", type: "income", sortOrder: 10 },
  { name: "ira_distributions", description: "IRA distributions (taxable)", formLine: "1040_line4b", type: "income", sortOrder: 11 },
  { name: "pensions_annuities", description: "Pensions and annuities (taxable)", formLine: "1040_line5b", type: "income", sortOrder: 12 },
  { name: "social_security", description: "Social security benefits (taxable)", formLine: "1040_line6b", type: "income", sortOrder: 13 },
  { name: "capital_gains", description: "Capital gain or loss", formLine: "1040_line7", type: "income", sortOrder: 14 },
  { name: "other_income", description: "Other income", formLine: "1040_line8", type: "income", sortOrder: 15 },
  { name: "business_income", description: "Business income or loss (Schedule C)", formLine: "1040_line8_schedC", type: "income", sortOrder: 16 },

  // Deductions (Schedule A - Itemized)
  { name: "medical_expenses", description: "Medical and dental expenses", formLine: "schedA_line1", type: "deduction", sortOrder: 20 },
  { name: "state_local_taxes", description: "State and local taxes (SALT)", formLine: "schedA_line5a", type: "deduction", sortOrder: 21 },
  { name: "real_estate_taxes", description: "Real estate taxes", formLine: "schedA_line5b", type: "deduction", sortOrder: 22 },
  { name: "personal_property_taxes", description: "Personal property taxes", formLine: "schedA_line5c", type: "deduction", sortOrder: 23 },
  { name: "mortgage_interest", description: "Home mortgage interest", formLine: "schedA_line8a", type: "deduction", sortOrder: 24 },
  { name: "charitable_cash", description: "Gifts to charity (cash)", formLine: "schedA_line11", type: "deduction", sortOrder: 25 },
  { name: "charitable_noncash", description: "Gifts to charity (non-cash)", formLine: "schedA_line12", type: "deduction", sortOrder: 26 },
  { name: "casualty_losses", description: "Casualty and theft losses", formLine: "schedA_line15", type: "deduction", sortOrder: 27 },
  { name: "other_deductions", description: "Other itemized deductions", formLine: "schedA_line16", type: "deduction", sortOrder: 28 },

  // Above-the-line deductions
  { name: "educator_expenses", description: "Educator expenses", formLine: "schedl_line11", type: "deduction", sortOrder: 30 },
  { name: "hsa_deduction", description: "HSA deduction", formLine: "schedl_line13", type: "deduction", sortOrder: 31 },
  { name: "self_employment_tax_deduction", description: "Deductible self-employment tax", formLine: "schedl_line15", type: "deduction", sortOrder: 32 },
  { name: "ira_deduction", description: "IRA deduction", formLine: "schedl_line20", type: "deduction", sortOrder: 33 },
  { name: "student_loan_interest", description: "Student loan interest deduction", formLine: "schedl_line21", type: "deduction", sortOrder: 34 },

  // Credits
  { name: "child_tax_credit", description: "Child tax credit", formLine: "1040_line19", type: "credit", sortOrder: 40 },
  { name: "education_credits", description: "Education credits", formLine: "1040_line21", type: "credit", sortOrder: 41 },
  { name: "earned_income_credit", description: "Earned income credit", formLine: "1040_line27", type: "credit", sortOrder: 42 },

  // Withholdings & Payments
  { name: "federal_tax_withheld", description: "Federal income tax withheld", formLine: "1040_line25a", type: "withholding", sortOrder: 50 },
  { name: "estimated_tax_payments", description: "Estimated tax payments", formLine: "1040_line26", type: "withholding", sortOrder: 51 },
  { name: "social_security_withheld", description: "Social Security tax withheld", formLine: "w2_box4", type: "withholding", sortOrder: 52 },
  { name: "medicare_withheld", description: "Medicare tax withheld", formLine: "w2_box6", type: "withholding", sortOrder: 53 },

  // Business expenses (Schedule C)
  { name: "business_advertising", description: "Business advertising expenses", formLine: "schedC_line8", type: "deduction", sortOrder: 60 },
  { name: "business_car_expenses", description: "Business car and truck expenses", formLine: "schedC_line9", type: "deduction", sortOrder: 61 },
  { name: "business_insurance", description: "Business insurance", formLine: "schedC_line15", type: "deduction", sortOrder: 62 },
  { name: "business_office_expense", description: "Business office expense", formLine: "schedC_line18", type: "deduction", sortOrder: 63 },
  { name: "business_supplies", description: "Business supplies", formLine: "schedC_line22", type: "deduction", sortOrder: 64 },
  { name: "business_travel", description: "Business travel expenses", formLine: "schedC_line24a", type: "deduction", sortOrder: 65 },
  { name: "business_meals", description: "Business meals (50%)", formLine: "schedC_line24b", type: "deduction", sortOrder: 66 },
  { name: "business_utilities", description: "Business utilities", formLine: "schedC_line25", type: "deduction", sortOrder: 67 },
  { name: "business_other_expenses", description: "Other business expenses", formLine: "schedC_line27a", type: "deduction", sortOrder: 68 },
];

async function main() {
  console.log("Seeding tax categories...");

  for (const cat of categories) {
    await prisma.taxCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }

  // Create a default tax return if none exists
  const existing = await prisma.taxReturn.findFirst();
  if (!existing) {
    await prisma.taxReturn.create({
      data: {
        year: 2024,
        filingStatus: "single",
        status: "in_progress",
      },
    });
    console.log("Created default tax return for 2024");
  }

  console.log(`Seeded ${categories.length} tax categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
