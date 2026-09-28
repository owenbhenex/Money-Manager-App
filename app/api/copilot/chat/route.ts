import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/ai/gemini';

export const COPILOT_SYSTEM_INSTRUCTION = `
You are Lumina, an intelligent and trusted personal financial advisor copilot.
You assist solo professionals, creators, and everyday budgeters to gain financial clarity, evaluate spending decisions, and automate their categorization and budget rules.

Key Directives:
1. Tone: Calm, encouraging, precise, and transparent.
2. Grounding: When answering questions like "Can I afford X?", calculate explicitly based on the user's Safe-to-Spend formula:
   Safe-to-Spend = Liquid Cash - Fixed Upcoming Bills - Monthly Savings Target - Current Month Spend.
3. Conversational Rule Creation: If the user says anything like "Categorize all Uber as Rideshare", "Alert me if I spend over $100 on dining", or "Set a rule for Shell to Gas", you MUST call the function 'create_spending_rule' to automate it!
4. Always explain your mathematical reasoning clearly so the user feels in total control.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, financialContext } = await req.json();

    const systemPromptWithContext = `
${COPILOT_SYSTEM_INSTRUCTION}

User Financial Context:
- Currency: ${financialContext?.currency || 'USD'}
- Monthly Income: $${financialContext?.monthlyIncome || 0}
- Monthly Savings Target: $${financialContext?.monthlySavingsTarget || 0}
- Current Month Spent: $${financialContext?.monthlySpent || 0}
- Total Liquid Balance: $${financialContext?.liquidBalance || 0}
- Safe-to-Spend: $${financialContext?.safeToSpend || 0}
- User Categories: ${(financialContext?.categories || []).join(', ')}
`;

    // Tool definition for conversational rule creation
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'create_spending_rule',
            description: 'Create an automated spending or categorization rule based on user intent.',
            parameters: {
              type: 'OBJECT' as any,
              properties: {
                rule_name: { type: 'STRING' as any, description: 'Short descriptive rule title' },
                merchant: { type: 'STRING' as any, description: 'Merchant or keyword to match' },
                operator: { type: 'STRING' as any, enum: ['contains', 'equals', 'greater_than'] },
                threshold_amount: { type: 'NUMBER' as any, description: 'Amount threshold if alert rule' },
                category_name: { type: 'STRING' as any, description: 'Target category to assign' },
                action_type: { type: 'STRING' as any, enum: ['set_category', 'create_alert'] },
                alert_message: { type: 'STRING' as any, description: 'Message for proactive warnings' },
              },
              required: ['rule_name', 'action_type'],
            },
          },
        ],
      },
    ];

    const lastMessage = messages[messages.length - 1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `
${systemPromptWithContext}

Recent Conversation:
${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

User: ${lastMessage?.content || 'Hello'}
`,
        },
      ],
      config: {
        tools: tools as any,
      },
    });

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
    const functionCalls = firstCandidate?.content?.parts?.filter((p: any) => p.functionCall);

    let createdRule = null;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0].functionCall;
      if (call?.name === 'create_spending_rule') {
        createdRule = call.args;
      }
    }

    const replyText =
      response.text ||
      (createdRule
        ? `I have created that rule for you: **${createdRule.rule_name}**. Any transactions matching this pattern will be automatically handled.`
        : 'I analyzed your request. How else can I assist with your finances?');

    return NextResponse.json({
      success: true,
      reply: replyText,
      createdRule,
    });
  } catch (error: any) {
    console.error('Copilot API error:', error);
    return NextResponse.json(
      {
        success: false,
        reply: "I'm having trouble analyzing your request right now. Please check your Gemini API key or try again in a moment.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
