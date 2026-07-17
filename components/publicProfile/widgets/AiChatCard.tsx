"use client";

import { useState } from "react";
import { Bot, Gift, Send } from "lucide-react";

type ChatBlink = {
  name?: string;
  type?: string;
  link?: string;
};

type ChatMessage = {
  role: "assistant" | "visitor";
  text: string;
  blink?: ChatBlink | null;
};

export default function AiChatCard({ widgetId, config, mode }: { widgetId?: string; config: any; mode: "builder" | "public" }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: `Hi — I’m ${config.name || "your SmartSite concierge"}. How can I help?` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const interactive = mode === "public" && Boolean(widgetId);
  const training = config.documents?.some((doc: { status?: string }) => doc.status !== "trained");

  const send = async (question = input) => {
    const cleanQuestion = question.trim();
    if (!interactive || !widgetId || !cleanQuestion || sending) return;
    setInput("");
    setMessages((current) => [...current, { role: "visitor", text: cleanQuestion }]);
    setSending(true);
    const history = messages.slice(-10).map((message) => ({
      role: message.role === "visitor" ? "user" : "assistant",
      content: message.text,
    }));
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/${widgetId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: cleanQuestion, history }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: body.data.answer, blink: body.data.blink },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "I could not answer that.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"><Bot size={19} /></span>
        <div className="flex-1">
          <p className="font-bold">{config.name || "SmartSite Concierge"}</p>
          <p className="text-xs text-gray-500">{interactive ? `Trained on ${config.documents?.length || 0} docs` : training ? "Training · save to activate" : "Preview · save to activate"}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${interactive ? "bg-emerald-500" : "bg-gray-300"}`} />
      </div>
      <div className="flex h-[576px] flex-col gap-2 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === "visitor" ? "ml-auto bg-gray-950 text-white" : "bg-gray-100 text-gray-900"}`}>
            <p>{message.text}</p>
            {message.blink?.link ? (
              <a href={message.blink.link} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs font-bold text-violet-900">
                <Gift size={16} />
                <span>
                  <span className="block">{message.blink.name || "Claim reward"}</span>
                  <span className="block font-medium text-violet-600">Free · Claimable {message.blink.type || "NFT"}</span>
                </span>
              </a>
            ) : null}
          </div>
        ))}
        {sending && <div className="w-max rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-400">Thinking…</div>}
      </div>
      {messages.length === 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {config.starters?.map((starter: string) => (
            <button type="button" key={starter} onClick={() => send(starter)} className="flex-none rounded-full border px-3 py-1.5 text-xs font-semibold">{starter}</button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t p-3">
        <input disabled={!interactive || sending} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder={interactive ? "Ask a question…" : "Save Chat to test real responses"} className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm outline-none" />
        <button type="button" disabled={!interactive || sending || !input.trim()} onClick={() => send()} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-white disabled:opacity-40"><Send size={15} /></button>
      </div>
    </div>
  );
}
