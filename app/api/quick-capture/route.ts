import { NextRequest, NextResponse } from "next/server";
import { ai, QUICK_CAPTURE_SYSTEM_INSTRUCTION } from "@/lib/ai/gemini";
import { mapAiError } from "@/lib/ai/gemini";
import { parseJsonBody, badRequest } from "@/lib/api/body";
import { ExtractedTransaction } from "@/types/database.types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = (formData.get("mode") as string) || "text";
    const textPrompt = (formData.get("text") as string) || "";
    const categoriesRaw = (formData.get("categories") as string) || "[]";
    const file = formData.get("file") as File | null;

    let categories: string[] = [];
    try {
      categories = JSON.parse(categoriesRaw);
    } catch {
      categories = [
        "Food & Dining",
        "Transportation",
        "Groceries",
        "Utilities",
        "Entertainment",
        "Healthcare",
        "Personal Care",
        "Other",
      ];
    }

    const today = new Date().toISOString().split("T")[0];

    // Case 1: File provided (Receipt OCR or Audio Voice Memo)
    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");
      const mimeType =
        file.type || (mode === "voice" ? "audio/webm" : "image/jpeg");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
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

      const extracted: ExtractedTransaction = JSON.parse(response.text || "{}");
      return NextResponse.json({ success: true, data: extracted });
    }

    // Case 2: Plain Text Parsing
    if (textPrompt.trim()) {
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

      const extracted: ExtractedTransaction = JSON.parse(response.text || "{}");
      return NextResponse.json({ success: true, data: extracted });
    }

    return NextResponse.json(
      { success: false, error: "No text or file provided" },
      { status: 400 },
    );
  } catch (error) {
    const mapped = mapAiError(error);
    console.error("Quick capture API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: mapped.message,
        data: {
          amount: 0,
          merchant: "Manual Entry Needed",
          category_name: "Other",
          date: new Date().toISOString().split("T")[0],
          confidence: 0.1,
          notes: "AI processing encountered an error",
        },
      },
      { status: mapped.status },
    );
  }
}
