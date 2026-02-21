"use client";

import { useState } from "react";
import { useGeneratedForms } from "@/hooks/use-tax-return";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileOutput, Download, FilePlus } from "lucide-react";

interface GeneratedForm {
  id: string;
  formName: string;
  formType: string;
  status: string;
  filePath?: string;
  createdAt: string;
}

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "generating":
      return "secondary" as const;
    case "error":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function FormsPage() {
  const { forms, isLoading, mutate } = useGeneratedForms();
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Generation failed");
      await mutate();
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  }

  const typedForms = forms as GeneratedForm[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Generated Forms</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FilePlus className="mr-2 h-4 w-4" />
          )}
          Generate Forms
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileOutput className="h-5 w-5" />
            Tax Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : typedForms.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No forms generated yet. Click &quot;Generate Forms&quot; to create
              your tax forms.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">
                      {form.formName}
                    </TableCell>
                    <TableCell>{form.formType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(form.status)}>
                        {form.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {form.status === "completed" ? (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/api/generate-forms/${form.id}/download`}
                            download
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </a>
                        </Button>
                      ) : form.status === "generating" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
