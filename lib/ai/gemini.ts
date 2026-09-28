import { GoogleGenAI } from '@google/genai';
import { ExtractedTransaction } from '@/types/database.types';

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export const QUICK_CAPTURE_SYSTEM_INSTRUCTION = `
You are the Lumina Money multimodal expense parser.
Your task is to parse unstructured input (text memo, spoken voice transcript, or receipt OCR) into structured financial transactions.

Guidelines:
1. Extract the merchant/store name accurately.
2. Determine the total amount. If it's an expense, return it as a positive number (the backend will store it with appropriate sign).
3. Identify the best category name from the user's available categories. If no exact match, assign the most logical category (e.g. 'Food & Dining', 'Transportation', 'Groceries', 'Utilities', 'Entertainment', 'Healthcare', 'Personal Care').
4. Estimate confidence between 0.00 and 1.00 based on clarity of the input.
5. Extract date in ISO format YYYY-MM-DD. If missing, use today's date.
6. Provide helpful short notes if details like specific items or companions were mentioned.
`;

export async function parseQuickCaptureText(
  input: string,
  categories: string[]
): Promise<ExtractedTransaction> {
  const prompt = `
User Input: "${input}"
Available Categories: ${categories.join(', ')}
Today's Date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with a JSON object in this format:
{
  "amount": number,
  "merchant": string,
  "category_name": string,
  "date": "YYYY-MM-DD",
  "confidence": number,
  "notes": string
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: QUICK_CAPTURE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    return JSON.parse(text) as ExtractedTransaction;
  } catch (error) {
    console.error('Gemini text extraction failed:', error);
    // Graceful fallback for offline / mock testing
    return {
      amount: 0,
      merchant: 'Unknown Merchant',
      category_name: 'Other',
      date: new Date().toISOString().split('T')[0],
      confidence: 0.1,
      notes: input,
    };
  }
}
