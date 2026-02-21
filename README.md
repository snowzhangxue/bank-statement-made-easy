# Bank Statement Made Easy

A web app that automates tax document processing — upload bank statements, W-2s, 1099s, and receipts, then let AI extract, categorize, and organize your financial data.

## Features

### Document Upload & Parsing
- Drag-and-drop upload for PDFs, images (PNG, JPG, WebP, GIF), and CSV files
- AI-powered document parsing using configurable LLM providers (Kimi K2.5, Claude, OpenAI)
- Auto-detects document type (W-2, 1099, bank statement, receipt)
- Auto-detects bank/institution name from document content
- Re-parse support for updating previously parsed documents

### Smart Categorization
- Rule-based categorization for W-2 boxes and 1099 form fields
- Keyword-based matching for common transaction descriptions
- AI fallback for ambiguous items
- 46 pre-seeded IRS tax categories

### Review & Organize
- Items grouped by bank/institution with collapsible sections
- Filter by bank/source via dropdown
- Inline editing of descriptions, amounts, and categories
- Confidence scores for AI-assigned categories
- Bulk verify and per-item verification
- Delete individual items

### Tax Calculation
- 2024 federal tax bracket computation
- Supports all filing statuses (single, married filing jointly/separately, head of household)
- Automatic AGI calculation
- Standard vs. itemized deduction comparison
- Withholding and credits applied to compute refund or amount owed

### IRS Form Generation
- Auto-generates Form 1040 and applicable schedules (A, B, C, D)
- Maps computed values to official IRS PDF field names
- Fillable PDF output via pdf-lib

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React, shadcn/ui, Tailwind CSS
- **Database**: Prisma 7 + SQLite
- **AI**: Multi-provider support — Kimi K2.5 (default), Claude, OpenAI
- **PDF**: pdf-lib for IRS form filling
- **Other**: SWR, react-dropzone, papaparse

## Getting Started

### Prerequisites
- Node.js 18+
- An API key for at least one LLM provider

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` or create `.env`:

```env
DATABASE_URL="file:./dev.db"

# LLM Provider: "kimi" | "claude" | "openai"
LLM_PROVIDER="kimi"

# Kimi (Moonshot AI)
KIMI_API_KEY="your-kimi-api-key"
KIMI_MODEL="kimi-k2.5"
KIMI_BASE_URL="https://api.moonshot.cn/v1"

# Claude (Anthropic)
ANTHROPIC_API_KEY=""
CLAUDE_MODEL="claude-sonnet-4-5-20250514"

# OpenAI
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o"
OPENAI_BASE_URL=""
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Upload** — Drag and drop tax documents on the Upload page
2. **Parse** — Click "Parse" to extract financial data with AI
3. **Review** — Check extracted items grouped by bank, edit categories and amounts
4. **Summary** — View income, deductions, and estimated tax
5. **Forms** — Generate and download filled IRS PDF forms
