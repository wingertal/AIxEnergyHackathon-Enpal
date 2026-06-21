import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// The conversational companion is served by the unified enpal backend, which
// grounds answers in the household's own profile/data and persists the thread.
const API_BASE = (
  process.env.ENPAL_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

interface ChatBody {
  householdId: string;
  message: string;
  conversationId?: number | null;
}

export async function POST(req: NextRequest) {
  const { householdId, message, conversationId } = (await req.json()) as ChatBody;

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        household_id: householdId,
        message,
        conversation_id: conversationId ?? null,
      }),
    });
    if (!res.ok) throw new Error(`enpal chat responded ${res.status}`);
    const data = (await res.json()) as { reply: string; conversation_id: number };
    return NextResponse.json({
      answer: data.reply,
      conversationId: data.conversation_id,
    });
  } catch (err) {
    console.error("enpal chat call failed:", err);
    return NextResponse.json({
      answer:
        "Sorry, I couldn't reach your energy assistant just now. Please try again in a moment.",
      conversationId: conversationId ?? null,
    });
  }
}
