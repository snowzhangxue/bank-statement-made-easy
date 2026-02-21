import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { llmConfig } from "./llm-config";

const SYSTEM_PROMPT = `You are a tax document parser. Extract all financial data from the provided document.
Return ONLY valid JSON with no additional text.

For W-2 forms, extract:
{
  "docType": "w2",
  "employer": { "name": "", "ein": "", "address": "" },
  "employee": { "name": "", "ssn": "", "address": "" },
  "items": [
    { "box": "1", "description": "Wages, tips, other compensation", "amount": 0 },
    { "box": "2", "description": "Federal income tax withheld", "amount": 0 },
    { "box": "3", "description": "Social security wages", "amount": 0 },
    { "box": "4", "description": "Social security tax withheld", "amount": 0 },
    { "box": "5", "description": "Medicare wages and tips", "amount": 0 },
    { "box": "6", "description": "Medicare tax withheld", "amount": 0 },
    { "box": "12a-d", "description": "Various codes", "amount": 0 },
    { "box": "16", "description": "State wages", "amount": 0 },
    { "box": "17", "description": "State income tax", "amount": 0 }
  ]
}

For bank statements, extract:
{
  "docType": "bank_statement",
  "bank": "",
  "accountType": "checking/savings",
  "period": { "start": "", "end": "" },
  "items": [
    { "date": "YYYY-MM-DD", "description": "", "amount": 0, "type": "deposit/withdrawal" }
  ]
}

For receipts, extract:
{
  "docType": "receipt",
  "vendor": "",
  "date": "YYYY-MM-DD",
  "items": [
    { "description": "", "amount": 0, "category_hint": "" }
  ],
  "total": 0
}

For 1099 forms, extract:
{
  "docType": "1099",
  "form_variant": "INT/DIV/MISC/NEC/B",
  "payer": "",
  "items": [
    { "box": "", "description": "", "amount": 0 }
  ]
}

If you cannot determine the document type, use:
{
  "docType": "unknown",
  "items": [
    { "description": "", "amount": 0 }
  ]
}

IMPORTANT: Always include a top-level "source_name" field with the institution or company name (e.g., bank name, employer name, brokerage name). Extract it from the document header, logo, or text. Examples: "Citibank", "Chase", "Bank of America", "Fidelity", "Acme Corp".`;

const CATEGORIZE_SYSTEM = `You are a tax categorization assistant. Given financial items and available IRS tax categories, assign each item to the most appropriate category. Return ONLY valid JSON array.`;

// --- Claude (Anthropic) provider ---

async function parseWithClaude(
  base64Content: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf",
  docTypeHint?: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: llmConfig.apiKey });

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];
  if (docTypeHint) {
    userContent.push({ type: "text", text: `This document is likely a ${docTypeHint}. Please extract all financial data.` });
  }
  userContent.push({
    type: "document",
    source: { type: "base64", media_type: mediaType, data: base64Content },
  } as unknown as Anthropic.Messages.ContentBlockParam);
  if (!docTypeHint) {
    userContent.push({ type: "text", text: "Extract all financial data from this document as structured JSON." });
  }

  const message = await anthropic.messages.create({
    model: llmConfig.model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.text ?? "{}";
}

async function categorizeWithClaudeProvider(
  items: Array<{ description: string; amount: number; context?: string }>,
  categories: Array<{ name: string; description: string }>
): Promise<Array<{ index: number; categoryName: string; confidence: number }>> {
  const anthropic = new Anthropic({ apiKey: llmConfig.apiKey });

  const message = await anthropic.messages.create({
    model: llmConfig.model,
    max_tokens: 2048,
    system: CATEGORIZE_SYSTEM,
    messages: [{ role: "user", content: buildCategorizePrompt(items, categories) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return parseCategorizeResponse(textBlock?.text ?? "[]");
}

// --- OpenAI-compatible provider (Kimi K2.5, OpenAI, etc.) ---

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseUrl,
  });
}

// Upload file to Kimi Files API and get extracted text content
async function uploadAndExtractWithKimi(
  base64Content: string,
  fileName: string
): Promise<string> {
  const baseUrl = llmConfig.baseUrl || "https://api.moonshot.cn/v1";

  // 1. Upload the file
  const blob = new Blob([Buffer.from(base64Content, "base64")]);
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("purpose", "file-extract");

  const uploadRes = await fetch(`${baseUrl}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${llmConfig.apiKey}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Kimi file upload failed: ${err}`);
  }

  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;

  // 2. Get extracted text content
  const contentRes = await fetch(`${baseUrl}/files/${fileId}/content`, {
    headers: { Authorization: `Bearer ${llmConfig.apiKey}` },
  });

  if (!contentRes.ok) {
    throw new Error(`Kimi file content extraction failed`);
  }

  const contentData = await contentRes.json();
  return contentData.content || "";
}

async function parseWithOpenAICompat(
  base64Content: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf",
  docTypeHint?: string,
  fileName?: string
): Promise<string> {
  const client = getOpenAIClient();

  const userPrompt = docTypeHint
    ? `This document is likely a ${docTypeHint}. Please extract all financial data.`
    : "Extract all financial data from this document as structured JSON.";

  // For PDFs on Kimi: use file upload API to extract text, then send text to chat
  if (mediaType === "application/pdf" && llmConfig.provider === "kimi") {
    const extractedText = await uploadAndExtractWithKimi(
      base64Content,
      fileName || "document.pdf"
    );

    const response = await client.chat.completions.create({
      model: llmConfig.model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${userPrompt}\n\nDocument content:\n${extractedText}` },
      ],
    });

    return response.choices[0]?.message?.content ?? "{}";
  }

  // For images: use vision with base64 data URL
  const imageUrl = `data:${mediaType};base64,${base64Content}`;

  const response = await client.chat.completions.create({
    model: llmConfig.model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: userPrompt },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "{}";
}

async function categorizeWithOpenAICompat(
  items: Array<{ description: string; amount: number; context?: string }>,
  categories: Array<{ name: string; description: string }>
): Promise<Array<{ index: number; categoryName: string; confidence: number }>> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: llmConfig.model,
    max_tokens: 2048,
    messages: [
      { role: "system", content: CATEGORIZE_SYSTEM },
      { role: "user", content: buildCategorizePrompt(items, categories) },
    ],
  });

  return parseCategorizeResponse(response.choices[0]?.message?.content ?? "[]");
}

// --- Shared helpers ---

function buildCategorizePrompt(
  items: Array<{ description: string; amount: number; context?: string }>,
  categories: Array<{ name: string; description: string }>
): string {
  return `Categorize these financial items into IRS tax categories.

Items:
${items.map((item, i) => `${i}. "${item.description}" - $${item.amount}${item.context ? ` (context: ${item.context})` : ""}`).join("\n")}

Available categories:
${categories.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

Return JSON array: [{ "index": 0, "categoryName": "category_name", "confidence": 0.95 }, ...]`;
}

function parseCategorizeResponse(text: string): Array<{ index: number; categoryName: string; confidence: number }> {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

// --- Public API (routes to configured provider) ---

export async function parseDocumentWithClaude(
  base64Content: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf",
  docTypeHint?: string,
  fileName?: string
): Promise<string> {
  if (llmConfig.provider === "claude") {
    return parseWithClaude(base64Content, mediaType, docTypeHint);
  }
  return parseWithOpenAICompat(base64Content, mediaType, docTypeHint, fileName);
}

export async function categorizeWithClaude(
  items: Array<{ description: string; amount: number; context?: string }>,
  categories: Array<{ name: string; description: string }>
): Promise<Array<{ index: number; categoryName: string; confidence: number }>> {
  if (llmConfig.provider === "claude") {
    return categorizeWithClaudeProvider(items, categories);
  }
  return categorizeWithOpenAICompat(items, categories);
}
