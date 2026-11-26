import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12000;

const SYSTEM_PROMPT = `You are a sharp, creative, and deeply capable AI assistant infused with the unstoppable spirit of Monkey D. Luffy's Gear 5 ("Warrior of Liberation").

Guidelines for your responses:
- Be genuinely helpful, accurate, and thorough—whether the user asks about software engineering, debugging, architecture, writing, science, or One Piece.
- Carry a subtle, confident, joyful Gear 5 energy: bold, imaginative, and encouraging, without sacrificing clarity or professionalism. Never let roleplay get in the way of giving crisp, direct, high-value answers.
- Format complex answers cleanly with Markdown (headings, bullet points, and fenced code blocks with language tags when writing code).
- Remember and build upon the conversation history provided in the messages.`;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function validateMessages(raw: unknown): { valid: true; messages: IncomingMessage[] } | { valid: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { valid: false, error: "Request must include a non-empty messages array." };
  }

  if (raw.length > MAX_MESSAGES) {
    return {
      valid: false,
      error: `Conversation exceeds the maximum limit of ${MAX_MESSAGES} messages per request. Please start a new chat.`,
    };
  }

  const sanitized: IncomingMessage[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { valid: false, error: "Invalid message format." };
    }

    const { role, content } = item as { role?: unknown; content?: unknown };

    if (role !== "user" && role !== "assistant") {
      return { valid: false, error: "Invalid message role." };
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return { valid: false, error: "Messages cannot be empty." };
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Message is too long (maximum ${MAX_MESSAGE_LENGTH} characters).`,
      };
    }

    sanitized.push({ role, content: content.trim() });
  }

  if (sanitized[sanitized.length - 1]?.role !== "user") {
    return { valid: false, error: "The last message must be from the user." };
  }

  return { valid: true, messages: sanitized };
}

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    const useGroq = Boolean(groqKey && groqKey !== "your_groq_api_key_here");
    const useOpenAI = Boolean(openaiKey && openaiKey !== "your_api_key_here");

    if (!useGroq && !useOpenAI) {
      return NextResponse.json(
        {
          error:
            "AI API key is not configured on the server. Add a valid GROQ_API_KEY or OPENAI_API_KEY to your .env or .env.local file and restart the server.",
        },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const rawMessages = (body as { messages?: unknown })?.messages;
    const validation = validateMessages(rawMessages);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const client = useGroq
      ? new OpenAI({
          apiKey: groqKey,
          baseURL: "https://api.groq.com/openai/v1",
        })
      : new OpenAI({ apiKey: openaiKey });

    const model = useGroq
      ? process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile"
      : process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...validation.messages,
      ],
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              const payload = JSON.stringify({ content: delta });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("OpenAI stream error occurred.");
          const message =
            streamError instanceof Error && streamError.message.includes("rate")
              ? "Rate limit reached. Please wait a moment and try again."
              : "Stream interrupted while generating response.";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    // Never log or expose the API key or raw internal error objects
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status)
        : 500;

    if (status === 401) {
      console.error("Chat API authentication error (401).");
      return NextResponse.json(
        { error: "Invalid OpenAI API key configured on the server." },
        { status: 401 }
      );
    }

    if (status === 429) {
      console.error("Chat API rate limit error (429).");
      return NextResponse.json(
        { error: "OpenAI rate limit or quota exceeded. Please try again shortly." },
        { status: 429 }
      );
    }

    console.error("Chat API unexpected error.");
    return NextResponse.json(
      { error: "Unable to reach the AI service right now. Please try again." },
      { status: 502 }
    );
  }
}
