"use client";

import { useState, useEffect } from "react";
import { useTaxReturn, useTaxSummary } from "@/hooks/use-tax-return";
import { FILING_STATUS_LABELS, type TaxSummary } from "@/types/tax";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  DollarSign,
  User,
  Calculator,
  TrendingUp,
} from "lucide-react";

function fmt(amount: number): string {
  return `$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  filingStatus: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export default function SummaryPage() {
  const { taxReturn, isLoading: returnLoading, mutate: mutateReturn } = useTaxReturn();
  const { summary, isLoading: summaryLoading } = useTaxSummary();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    ssn: "",
    filingStatus: "single",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (taxReturn) {
      setForm({
        firstName: taxReturn.firstName ?? "",
        lastName: taxReturn.lastName ?? "",
        ssn: taxReturn.ssn ?? "",
        filingStatus: taxReturn.filingStatus ?? "single",
        address: taxReturn.address ?? "",
        city: taxReturn.city ?? "",
        state: taxReturn.state ?? "",
        zip: taxReturn.zip ?? "",
      });
    }
  }, [taxReturn]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/tax-return", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await mutateReturn();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof PersonalInfo, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const s = summary as TaxSummary | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tax Summary</h1>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {returnLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ssn">SSN</Label>
                  <Input
                    id="ssn"
                    value={form.ssn}
                    onChange={(e) => updateField("ssn", e.target.value)}
                    placeholder="XXX-XX-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filingStatus">Filing Status</Label>
                  <Select
                    value={form.filingStatus}
                    onValueChange={(v) => updateField("filingStatus", v)}
                  >
                    <SelectTrigger id="filingStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FILING_STATUS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    maxLength={2}
                    placeholder="CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={form.zip}
                    onChange={(e) => updateField("zip", e.target.value)}
                    maxLength={10}
                    placeholder="12345"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Personal Info
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Summary Cards */}
      {summaryLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : s ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total Income"
              value={fmt(s.totalIncome)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <SummaryCard
              title="AGI"
              value={fmt(s.agi)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <SummaryCard
              title="Deductions"
              value={fmt(s.deductionAmount)}
              subtitle={`${s.deductionUsed === "standard" ? "Standard" : "Itemized"} (Std: ${fmt(s.standardDeduction)} / Item: ${fmt(s.itemizedDeduction)})`}
              icon={<Calculator className="h-4 w-4" />}
            />
            <SummaryCard
              title="Taxable Income"
              value={fmt(s.taxableIncome)}
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Tax Before Credits"
              value={fmt(s.taxBeforeCredits)}
              icon={<Calculator className="h-4 w-4" />}
            />
            <SummaryCard
              title="Credits"
              value={fmt(s.totalCredits)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <SummaryCard
              title="Withholdings"
              value={fmt(s.totalWithholdings)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <SummaryCard
              title={s.refundOrOwed >= 0 ? "Refund" : "Amount Owed"}
              value={fmt(s.refundOrOwed)}
              className={
                s.refundOrOwed >= 0
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
              valueClassName={
                s.refundOrOwed >= 0 ? "text-green-700" : "text-red-700"
              }
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          {/* Effective Rate */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Effective Tax Rate:{" "}
                <span className="font-semibold text-foreground">
                  {(s.effectiveRate * 100).toFixed(2)}%
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Bracket Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Bracket Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">
                      Taxable Amount
                    </TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.bracketBreakdown.map((bracket) => (
                    <TableRow key={bracket.rate}>
                      <TableCell>
                        {(bracket.rate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(bracket.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(bracket.tax)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {fmt(s.taxableIncome)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(s.taxBeforeCredits)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tax summary available yet. Upload and review documents first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  className,
  valueClassName,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {title}
        </div>
        <p className={`mt-1 text-2xl font-bold ${valueClassName ?? ""}`}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
