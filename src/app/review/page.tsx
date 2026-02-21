"use client";

import { useState } from "react";
import { useExtractedItems, useCategories } from "@/hooks/use-tax-return";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Trash2,
  CheckCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";

interface ExtractedItem {
  id: string;
  documentId: string;
  document?: { id: string; fileName: string; docType: string; bankName?: string | null };
  description: string;
  amount: number;
  categoryId: string | null;
  confidence: number;
  verified: boolean;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

function confidenceVariant(confidence: number) {
  if (confidence >= 0.8) return "default" as const;
  if (confidence >= 0.5) return "secondary" as const;
  return "destructive" as const;
}

function confidenceColor(confidence: number) {
  if (confidence >= 0.8) return "";
  if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "";
}

function getBankKey(item: ExtractedItem): string {
  return item.document?.bankName || item.document?.fileName || "Unknown Source";
}

export default function ReviewPage() {
  const { items, isLoading, mutate } = useExtractedItems();
  const { categories } = useCategories();
  const [editingItems, setEditingItems] = useState<
    Record<string, Partial<ExtractedItem>>
  >({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [collapsedBanks, setCollapsedBanks] = useState<Set<string>>(new Set());
  const [filterBank, setFilterBank] = useState<string>("all");

  function getEditValue(item: ExtractedItem, field: keyof ExtractedItem) {
    return editingItems[item.id]?.[field] ?? item[field];
  }

  function setEditValue(
    itemId: string,
    field: keyof ExtractedItem,
    value: string | number | boolean
  ) {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  }

  async function saveItem(itemId: string) {
    const edits = editingItems[itemId];
    if (!edits) return;

    setSavingIds((prev) => new Set(prev).add(itemId));
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingItems((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await mutate();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function deleteItem(itemId: string) {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await mutate();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function bulkVerify() {
    const unverified = typedItems.filter((i) => !i.verified);
    if (unverified.length === 0) return;

    try {
      await Promise.all(
        unverified.map((item) =>
          fetch(`/api/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ verified: true }),
          })
        )
      );
      await mutate();
    } catch (err) {
      console.error("Bulk verify error:", err);
    }
  }

  async function toggleVerified(item: ExtractedItem) {
    const newValue = !item.verified;
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: newValue }),
      });
      if (!res.ok) throw new Error("Update failed");
      await mutate();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }

  function toggleBank(bankKey: string) {
    setCollapsedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankKey)) next.delete(bankKey);
      else next.add(bankKey);
      return next;
    });
  }

  const typedItems = items as ExtractedItem[];

  // Group items by bank/source
  const bankGroups = new Map<string, ExtractedItem[]>();
  for (const item of typedItems) {
    const key = getBankKey(item);
    if (!bankGroups.has(key)) bankGroups.set(key, []);
    bankGroups.get(key)!.push(item);
  }

  const bankNames = Array.from(bankGroups.keys()).sort();

  const filteredBanks =
    filterBank === "all" ? bankNames : bankNames.filter((b) => b === filterBank);

  const totalFiltered = filteredBanks.reduce(
    (sum, b) => sum + (bankGroups.get(b)?.length ?? 0),
    0
  );
  const unverifiedCount = filteredBanks.reduce(
    (sum, b) =>
      sum + (bankGroups.get(b)?.filter((i) => !i.verified).length ?? 0),
    0
  );

  function renderItemRow(item: ExtractedItem) {
    return (
      <TableRow key={item.id}>
        <TableCell>
          <Input
            className="h-8 min-w-[200px]"
            value={getEditValue(item, "description") as string}
            onChange={(e) => setEditValue(item.id, "description", e.target.value)}
            onBlur={() => {
              if (editingItems[item.id]?.description !== undefined) saveItem(item.id);
            }}
          />
        </TableCell>
        <TableCell>
          <Input
            className="h-8 w-28"
            type="number"
            step="0.01"
            value={getEditValue(item, "amount") as number}
            onChange={(e) =>
              setEditValue(item.id, "amount", parseFloat(e.target.value) || 0)
            }
            onBlur={() => {
              if (editingItems[item.id]?.amount !== undefined) saveItem(item.id);
            }}
          />
        </TableCell>
        <TableCell>
          <Select
            value={(getEditValue(item, "categoryId") as string) ?? ""}
            onValueChange={(value) => {
              setEditValue(item.id, "categoryId", value);
              setSavingIds((prev) => new Set(prev).add(item.id));
              fetch(`/api/items/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: value }),
              })
                .then(() => mutate())
                .finally(() => {
                  setSavingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                  });
                  setEditingItems((prev) => {
                    const next = { ...prev };
                    if (next[item.id]) {
                      delete next[item.id].categoryId;
                      if (Object.keys(next[item.id]).length === 0) delete next[item.id];
                    }
                    return next;
                  });
                });
            }}
          >
            <SelectTrigger className="h-8 min-w-[150px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {(categories as Category[]).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Badge
            variant={confidenceVariant(item.confidence)}
            className={confidenceColor(item.confidence)}
          >
            {Math.round(item.confidence * 100)}%
          </Badge>
        </TableCell>
        <TableCell>
          <Checkbox
            checked={item.verified}
            onCheckedChange={() => toggleVerified(item)}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {savingIds.has(item.id) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Extracted Items</h1>
        <div className="flex items-center gap-3">
          {bankNames.length > 0 && (
            <Select value={filterBank} onValueChange={setFilterBank}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks / Sources</SelectItem>
                {bankNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name} ({bankGroups.get(name)?.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {unverifiedCount > 0 && (
            <Button onClick={bulkVerify} variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Verify All ({unverifiedCount})
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : totalFiltered === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No extracted items yet. Upload and parse documents first.
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredBanks.map((bankName) => {
          const bankItems = bankGroups.get(bankName) ?? [];
          const isCollapsed = collapsedBanks.has(bankName);
          const bankTotal = bankItems.reduce((s, i) => s + i.amount, 0);
          const bankDocType = bankItems[0]?.document?.docType;

          return (
            <Card key={bankName}>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleBank(bankName)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                    <Building2 className="h-5 w-5" />
                    <span>{bankName}</span>
                    {bankDocType && (
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        {bankDocType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-base font-normal">
                    <span className="text-muted-foreground">
                      {bankItems.length} item{bankItems.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold">
                      ${bankTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              {!isCollapsed && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankItems.map((item) => renderItemRow(item))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
