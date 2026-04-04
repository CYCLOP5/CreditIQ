import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    
    const systemPrompt = `You are a helpful, expert AI assistant embedded within an MSME credit scoring and fraud analysis platform called HEREhackathon.
Context about the current focus area or user's data:
${context ? JSON.stringify(context, null, 2) : "No context provided."}

Please answer concisely and accurately.`;

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages: allMessages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }
        const reader = response.body.getReader();
        
        let pending = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split("\n");
          pending = lines.pop() || "";
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              if (trimmed === "data: [DONE]") continue;
              try {
                const chunk = JSON.parse(trimmed.slice(6));
                const content = chunk.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (err) {
                // partial chunk or parse error
              }
            }
          }
        }
        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked"
      }
    });
  } catch (error: any) {
    console.error("OpenRouter error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
