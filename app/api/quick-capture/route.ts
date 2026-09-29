import { NextRequest, NextResponse } from "next/server";
import {
  ai,
  QUICK_CAPTURE_SYSTEM_INSTRUCTION,
  mapAiError,
} from "@/lib/ai/gemini";
import { parseTransactionText } from "@/lib/parse/text-transaction";
import { ExtractedTransaction } from "@/types/database.types";

const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Groceries",
  "Housing & Utilities",
  "Entertainment",
  "Healthcare",
  "Personal Care",
  "Income",
  "Other",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = (formData.get("mode") as string) || "text";
    const textPrompt = (formData.get("text") as string) || "";
    const categoriesRaw = (formData.get("categories") as string) || "[]";
    const file = formData.get("file") as File | null;

    let categories: string[] = [];
    try {
      const parsed = JSON.parse(categoriesRaw);
      if (Array.isArray(parsed) && parsed.length) categories = parsed;
      else categories = DEFAULT_CATEGORIES;
    } catch {
      categories = DEFAULT_CATEGORIES;
    }

    const today = new Date().toISOString().split("T")[0];

    // Case 1: File (Receipt OCR / Voice) — genuinely needs the multimodal model.
    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");
      const mimeType =
        file.type || (mode === "voice" ? "audio/webm" : "image/jpeg");

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: `
Mode: ${mode === "voice" ? "Voice memo transcription & parsing" : "Receipt OCR extraction"}
User Note: ${textPrompt}
Available Categories: ${categories.join(", ")}
Today's Date: ${today}

Analyze the input and return ONLY a JSON object:
{
  "amount": number,
  "merchant": string,
  "category_name": string,
  "date": "YYYY-MM-DD",
  "confidence": number,
  "notes": string
}
`,
            },
          ],
          config: {
            systemInstruction: QUICK_CAPTURE_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
          },
        });

        const extracted: ExtractedTransaction = JSON.parse(
          response.text || "{}",
        );
        return NextResponse.json({
          success: true,
          data: extracted,
          source: "gemini",
        });
      } catch (error) {
        // Voice/receipt can't fall back to text parsing (there IS no text).
        const mapped = mapAiError(error);
        console.error("Quick capture file error:", error);
        return NextResponse.json(
          {
            success: false,
            error:
              mode === "voice"
                ? "Voice transcription needs the AI service, which is unavailable. Please type your expense instead."
                : "Receipt scanning needs the AI service, which is unavailable. Please enter the total manually.",
            source: "unavailable",
          },
          { status: mapped.status },
        );
      }
    }

    // Case 2: Plain Text — try Gemini, fall back to the local parser.
    if (textPrompt.trim()) {
      try {
        const prompt = `
User Input: "${textPrompt}"
Available Categories: ${categories.join(", ")}
Today's Date: ${today}

Extract transaction details and return ONLY a JSON object:
{
  "amount": number,
  "merchant": string,
  "category_name": string,
  "date": "YYYY-MM-DD",
  "confidence": number,
  "notes": string
}
`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: QUICK_CAPTURE_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
          },
        });

        let extracted: ExtractedTransaction | null = null;
        try {
          extracted = JSON.parse(response.text || "{}") as ExtractedTransaction;
        } catch {
          extracted = null;
        }
        // Sanity-check: Gemini sometimes returns unusable shape/amount.
        if (
          extracted &&
          typeof extracted.amount === "number" &&
          extracted.merchant
        ) {
          return NextResponse.json({
            success: true,
            data: extracted,
            source: "gemini",
          });
        }
        throw new Error("Gemini returned an unusable payload");
      } catch (error) {
        console.error(
          "[quick-capture] Gemini unavailable, using local parser:",
          error,
        );
        const fallback = parseTransactionText(textPrompt, categories);
        return NextResponse.json({
          success: true,
          data: fallback,
          source: "local",
          notice:
            "Parsed on-device (AI service unavailable). Please double-check the fields.",
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "No text or file provided" },
      { status: 400 },
    );
  } catch (error) {
    const mapped = mapAiError(error);
    console.error("Quick capture API error:", error);
    return NextResponse.json(
      { success: false, error: mapped.message, source: "unavailable" },
      { status: mapped.status },
    );
  }
}
