import { PDFDocument } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import type { FormFieldMapping } from "./form-mapper";

const FORM_TEMPLATES: Record<string, string> = {
  "1040": "f1040.pdf",
  schedA: "sa.pdf",
  schedB: "sb.pdf",
  schedC: "sc.pdf",
  schedD: "sd.pdf",
};

const FORM_NAMES: Record<string, string> = {
  "1040": "Form 1040 - U.S. Individual Income Tax Return",
  schedA: "Schedule A - Itemized Deductions",
  schedB: "Schedule B - Interest and Ordinary Dividends",
  schedC: "Schedule C - Profit or Loss from Business",
  schedD: "Schedule D - Capital Gains and Losses",
};

export function getFormName(formType: string): string {
  return FORM_NAMES[formType] ?? formType;
}

export async function fillPdfForm(
  formType: string,
  fields: FormFieldMapping[],
  outputPath: string
): Promise<{ success: boolean; filledFields: number; error?: string }> {
  const templateFileName = FORM_TEMPLATES[formType];
  if (!templateFileName) {
    return { success: false, filledFields: 0, error: `Unknown form type: ${formType}` };
  }

  const templatePath = path.join(process.cwd(), "public", "irs-templates", templateFileName);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    // If no template, create a simple placeholder PDF
    return createPlaceholderPdf(formType, fields, outputPath);
  }

  try {
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    let filledCount = 0;

    for (const field of fields) {
      try {
        const pdfField = form.getField(field.fieldName);
        if (pdfField) {
          const value = String(
            typeof field.value === "number"
              ? field.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : field.value
          );
          if ("setText" in pdfField) {
            (pdfField as { setText: (v: string) => void }).setText(value);
            filledCount++;
          } else if ("check" in pdfField && (field.value === "Yes")) {
            (pdfField as { check: () => void }).check();
            filledCount++;
          }
        }
      } catch {
        // Field not found in template, skip
      }
    }

    // Flatten form so it's not editable
    try {
      form.flatten();
    } catch {
      // Some forms may not support flatten
    }

    const pdfBytes = await pdfDoc.save();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, pdfBytes);

    return { success: true, filledFields: filledCount };
  } catch (error) {
    return createPlaceholderPdf(formType, fields, outputPath);
  }
}

async function createPlaceholderPdf(
  formType: string,
  fields: FormFieldMapping[],
  outputPath: string
): Promise<{ success: boolean; filledFields: number; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size

    const formName = getFormName(formType);
    page.drawText(formName, { x: 50, y: 742, size: 16 });
    page.drawText("Snow Tax - Generated Form (Template not available)", {
      x: 50,
      y: 720,
      size: 10,
    });
    page.drawText(`Tax Year 2024`, { x: 50, y: 700, size: 12 });

    let y = 670;
    for (const field of fields) {
      if (y < 50) {
        const newPage = pdfDoc.addPage([612, 792]);
        y = 742;
        // Continue on new page
        newPage.drawText(`${field.fieldName}: ${field.value}`, { x: 50, y, size: 10 });
      } else {
        page.drawText(`${field.fieldName}: ${field.value}`, { x: 50, y, size: 10 });
      }
      y -= 18;
    }

    const pdfBytes = await pdfDoc.save();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, pdfBytes);

    return { success: true, filledFields: fields.length, error: "Used placeholder (no IRS template)" };
  } catch (error) {
    return {
      success: false,
      filledFields: 0,
      error: `Failed to create PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
