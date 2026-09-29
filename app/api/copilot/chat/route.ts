import { NextResponse } from "next/server";
import {
  ai,
  COPILOT_SYSTEM_INSTRUCTION,
  buildCopilotContents,
  createRuleTool,
  mapAiError,
} from "@/lib/ai/gemini";

export async function POST(req: Request) {
  try {
    const { question, context, messages } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid question" },
        { status: 400 },
      );
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: buildCopilotContents(question, messages, context),
      config: {
        systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
        temperature: 0.4,
        maxOutputTokens: 2048,
        tools: [createRuleTool as any],
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Surface tool calls the model decides to make
            const fnCalls = chunk.functionCalls;
            if (fnCalls?.length) {
              for (const call of fnCalls) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "tool_call", name: call.name, args: call.args })}\n\n`,
                  ),
                );
              }
            }
            if (chunk.text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`,
                ),
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Stream failed" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const mapped = mapAiError(error);
    console.error("Copilot API error:", error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
