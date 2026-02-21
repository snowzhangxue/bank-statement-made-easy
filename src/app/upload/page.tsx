"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useDocuments } from "@/hooks/use-tax-return";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusVariant(status: string) {
  switch (status) {
    case "parsed":
      return "default" as const;
    case "parsing":
      return "secondary" as const;
    case "error":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export default function UploadPage() {
  const { documents, isLoading, mutate } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());
  const [errorDoc, setErrorDoc] = useState<Doc | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/documents", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Upload failed");
        }
        await mutate();
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    },
    [mutate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "text/csv": [".csv"],
    },
  });

  async function handleParse(documentId: string) {
    setParsingIds((prev) => new Set(prev).add(documentId));
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Parse error:", data.error);
      }
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      setParsingIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      await mutate();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Upload Documents</h1>

      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, images (PNG, JPG), and CSV files
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No documents uploaded yet. Upload files above to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc: Doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {doc.fileName}
                    </TableCell>
                    <TableCell>{doc.docType}</TableCell>
                    <TableCell>
                      {doc.parseStatus === "error" ? (
                        <Badge
                          variant="destructive"
                          className="cursor-pointer gap-1"
                          onClick={() => setErrorDoc(doc)}
                        >
                          <AlertCircle className="h-3 w-3" />
                          error
                        </Badge>
                      ) : (
                        <Badge variant={statusVariant(doc.parseStatus)}>
                          {doc.parseStatus}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            doc.parseStatus === "parsing" ||
                            parsingIds.has(doc.id)
                          }
                          onClick={() => handleParse(doc.id)}
                        >
                          {parsingIds.has(doc.id) ||
                          doc.parseStatus === "parsing" ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Parsing...
                            </>
                          ) : doc.parseStatus === "parsed" ? (
                            "Re-parse"
                          ) : doc.parseStatus === "error" ? (
                            "Retry"
                          ) : (
                            "Parse"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!errorDoc} onOpenChange={() => setErrorDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Parse Error
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">File</p>
              <p className="text-sm">{errorDoc?.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Error Message</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                {errorDoc?.errorMsg || "Unknown error"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
