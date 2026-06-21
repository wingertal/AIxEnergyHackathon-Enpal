"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "./icons";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Suggestion {
  id?: string;
  text: string;
}

export function AskScreen({
  householdId,
  preset,
  suggestions = [],
}: {
  householdId: string;
  preset?: string;
  suggestions?: Suggestion[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  // Server-side conversation id, keeps the thread persisted on the enpal backend.
  const conversationId = useRef<number | null>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user" as const, content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          message: q,
          conversationId: conversationId.current,
        }),
      });
      const data = await res.json();
      if (data.conversationId != null) conversationId.current = data.conversationId;
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't reach your data just now. Try again?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // auto-send a preset question once
  useEffect(() => {
    if (preset && !sent.current) {
      sent.current = true;
      send(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && !loading && (
          <div className="space-y-3">
            <div className="card p-5 text-[13px] leading-relaxed text-muted">
              Ask me anything about your energy, your bill, your contract, your solar, or the
              best time to use power. I answer from your real data.
            </div>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-[12px] font-medium text-muted">People often ask</div>
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s.id ?? s.text}
                    onClick={() => send(s.text)}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3 text-left text-[13px] text-[var(--home)] active:scale-[0.99] transition-transform"
                  >
                    {s.text}
                    <span className="text-muted">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} {...m} />
        ))}
        {loading && (
          <div className="flex w-fit gap-1.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-sm">
            <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your energy…"
          className="flex-1 rounded-full border bg-white px-4 py-3 text-[14px] outline-none placeholder:text-muted focus:ring-2 focus:ring-[var(--accent)]/25"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send />
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: Msg) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-up`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? "rounded-br-md bg-[var(--accent)] text-white"
            : "rounded-bl-md bg-white text-[var(--home)] shadow-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-muted"
      style={{ animation: "livePulse 1s ease-in-out infinite", animationDelay: `${d}s` }}
    />
  );
}
