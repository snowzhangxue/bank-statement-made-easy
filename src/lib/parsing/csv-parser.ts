import Papa from "papaparse";

export interface CsvTransaction {
  date: string;
  description: string;
  amount: number;
  type: "deposit" | "withdrawal";
}

export function parseCsvTransactions(csvContent: string): CsvTransaction[] {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  if (!result.data || result.data.length === 0) return [];

  const rows = result.data as Record<string, string>[];
  const transactions: CsvTransaction[] = [];

  for (const row of rows) {
    // Try to detect date, description, and amount columns
    const date = row["date"] || row["transaction date"] || row["post date"] || row["posting date"] || "";
    const description =
      row["description"] || row["memo"] || row["payee"] || row["transaction"] || row["name"] || "";

    // Amount might be in a single column or split into debit/credit
    let amount = 0;
    let type: "deposit" | "withdrawal" = "withdrawal";

    if (row["amount"]) {
      amount = parseFloat(row["amount"].replace(/[,$]/g, "")) || 0;
      type = amount >= 0 ? "deposit" : "withdrawal";
      amount = Math.abs(amount);
    } else if (row["debit"] || row["credit"]) {
      const debit = parseFloat((row["debit"] || "0").replace(/[,$]/g, "")) || 0;
      const credit = parseFloat((row["credit"] || "0").replace(/[,$]/g, "")) || 0;
      if (credit > 0) {
        amount = credit;
        type = "deposit";
      } else {
        amount = debit;
        type = "withdrawal";
      }
    }

    if (description && amount > 0) {
      transactions.push({ date, description, amount, type });
    }
  }

  return transactions;
}
