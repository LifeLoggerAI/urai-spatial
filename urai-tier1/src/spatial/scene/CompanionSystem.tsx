"use client";

import { useMemo, useState } from "react";
import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

type CompanionMessage = {
  id: string;
  role: "companion" | "user";
  text: string;
};

type CompanionSystemProps = {
  open: boolean;
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
  onClose: () => void;
};

function seedMessage(mode: LifeMapMode, selectedNode: LifeMapNode | null) {
  if (selectedNode) return selectedNode.narratorLine;
  if (mode === "shadow") return "I am here gently. We can look at the pattern without turning it into judgment.";
  if (mode === "recovery") return "I can help you notice what is already repairing itself.";
  if (mode === "dream") return "Tell me what image stayed with you. I will help translate the symbol.";
  if (mode === "relationship") return "We can look at the relational signal without forcing a conclusion.";
  if (mode === "mirror") return "Let us zoom out together. The arc is larger than this moment.";
  return "I am here. Ask me what your sky is trying to show you.";
}

function quickReplies(mode: LifeMapMode, selectedNode: LifeMapNode | null) {
  if (selectedNode) {
    return [
      "What does this star mean?",
      "Turn this into a reflection.",
      "Show me the softer interpretation.",
    ];
  }

  if (mode === "shadow") return ["Explain this gently.", "What pattern is repeating?", "How do I soften it?"];
  if (mode === "recovery") return ["Where am I healing?", "Name the rebound.", "Make this a ritual."];
  if (mode === "dream") return ["Decode the dream symbol.", "Connect it to mood.", "Save this as a dream note."];
  if (mode === "relationship") return ["What changed between us?", "Map the signal.", "What should I not assume?"];

  return ["What is my sky showing?", "Summarize my patterns.", "Start a reflection."];
}

export default function CompanionSystem({ open, mode, selectedNode, onClose }: CompanionSystemProps) {
  const [messages, setMessages] = useState<CompanionMessage[]>([
    { id: "seed", role: "companion", text: seedMessage(mode, selectedNode) },
  ]);
  const [draft, setDraft] = useState("");

  const replies = useMemo(() => quickReplies(mode, selectedNode), [mode, selectedNode]);

  if (!open) return null;

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: clean },
      {
        id: `companion-${Date.now()}`,
        role: "companion",
        text: selectedNode
          ? `I am reading this through ${selectedNode.title}. The important part is not only what happened, but what pattern it belongs to.`
          : "I can hold this as a reflection thread. The next layer is to connect it to your sky, your rhythm, and the pattern underneath it.",
      },
    ]);
    setDraft("");

    window.dispatchEvent(
      new CustomEvent("urai:companion.message", {
        detail: {
          mode,
          starId: selectedNode?.id ?? null,
          text: clean,
          timestamp: Date.now(),
        },
      })
    );
  };

  return (
    <section className="companion-system" role="dialog" aria-label="URAI Companion chat" data-testid="urai-companion-system">
      <div className="companion-shell">
        <header>
          <div className="companion-pulse" />
          <div>
            <p>URAI COMPANION</p>
            <h2>{selectedNode ? selectedNode.title : "Your reflective companion"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close URAI Companion">×</button>
        </header>

        <div className="companion-thread">
          {messages.map((message) => (
            <article key={message.id} data-role={message.role}>
              {message.text}
            </article>
          ))}
        </div>

        <div className="companion-replies">
          {replies.map((reply) => (
            <button key={reply} type="button" onClick={() => send(reply)}>{reply}</button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask URAI what this means..."
            aria-label="Message URAI Companion"
          />
          <button type="submit">Send</button>
        </form>
      </div>

      <style jsx>{`
        .companion-system {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 24px;
          background: radial-gradient(circle at 50% 35%, rgba(52, 151, 255, 0.22), transparent 34%), rgba(2, 7, 19, 0.68);
          backdrop-filter: blur(18px);
        }

        .companion-shell {
          width: min(520px, 94vw);
          max-height: min(720px, 90vh);
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px;
          border-radius: 28px;
          border: 1px solid rgba(172, 225, 255, 0.24);
          background: linear-gradient(180deg, rgba(10, 24, 48, 0.94), rgba(3, 10, 24, 0.96));
          box-shadow: 0 32px 120px rgba(0, 0, 0, 0.65), 0 0 80px rgba(70, 165, 255, 0.18);
          color: rgba(232, 246, 255, 0.94);
        }

        header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        header p {
          margin: 0 0 4px;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          color: rgba(191, 224, 255, 0.62);
        }

        header h2 {
          margin: 0;
          font-size: 1.08rem;
        }

        header button {
          margin-left: auto;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 1.2rem;
        }

        .companion-pulse {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: radial-gradient(circle at 32% 25%, #fff, #7fd1ff 24%, #1d63d3 66%, #051b42 100%);
          box-shadow: 0 0 30px rgba(86, 184, 255, 0.8);
          animation: companion-breathe 5.5s ease-in-out infinite;
        }

        .companion-thread {
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 6px 2px;
        }

        article {
          width: fit-content;
          max-width: 88%;
          border-radius: 18px;
          padding: 11px 13px;
          line-height: 1.45;
          font-size: 0.92rem;
        }

        article[data-role="companion"] {
          background: rgba(120, 193, 255, 0.12);
          border: 1px solid rgba(160, 218, 255, 0.16);
        }

        article[data-role="user"] {
          align-self: flex-end;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .companion-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .companion-replies button,
        form button {
          border: 1px solid rgba(176, 224, 255, 0.22);
          background: rgba(135, 205, 255, 0.1);
          color: rgba(239, 249, 255, 0.92);
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        form {
          display: flex;
          gap: 8px;
        }

        input {
          flex: 1;
          min-width: 0;
          border-radius: 999px;
          border: 1px solid rgba(176, 224, 255, 0.18);
          background: rgba(0, 0, 0, 0.2);
          color: white;
          padding: 11px 14px;
          outline: none;
        }

        @keyframes companion-breathe {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.045); filter: brightness(1.12); }
        }
      `}</style>
    </section>
  );
}
