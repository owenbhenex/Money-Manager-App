import { NextResponse } from "next/server";
import {
  ai,
  COPILOT_SYSTEM_INSTRUCTION,
  buildCopilotContents,
  createRuleTool,
  mapAiError,
} from "@/lib/ai/gemini";
import { generateLocalCopilotReply } from "@/lib/ai/local-copilot";

export async function POST(req: Request) {
  try {
    const { question, context, messages } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid question" },
        { status: 400 },
      );
    }

    let stream;
    try {
      stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: buildCopilotContents(question, messages, context),
        config: {
          systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
          temperature: 0.4,
          maxOutputTokens: 2048,
          tools: [createRuleTool as any],
        },
      });
    } catch (error) {
      // Gemini unavailable (quota/outage) → deterministic local reply,
      // streamed through the same SSE protocol so the UI is unchanged.
      const mapped = mapAiError(error);
      console.error("[copilot] Gemini unavailable, using local reply:", error);
      const local = generateLocalCopilotReply(question, context ?? {});
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          if (local.rule) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool_call", name: "create_rule", args: { name: local.rule.name, merchant_contains: local.rule.merchant_contains, category_name: local.rule.category_name, action: local.rule.action } })}\n\n`,
              ),
            );
          }
          // Stream in small chunks so the typing animation still feels right.
          const words = local.text.split(" ");
          for (let i = 0; i < words.length; i += 3) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", text: words.slice(i, i + 3).join(" ") + " " })}\n\n`,
              ),
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "source", source: "local" })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-AI-Source": "local",
        },
      });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
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
