"use client";

import React, { useMemo, useState } from "react";
import type { InsightFeedbackResponse, UraiInsight } from "@/lib/urai-insights/types";
import { applyFeedback } from "@/lib/urai-insights/feedback";

type InsightCardProps = {
  insight?: UraiInsight;
  onFeedback?: (response: InsightFeedbackResponse) => void;
};

export function InsightCard({ insight, onFeedback }: InsightCardProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<InsightFeedbackResponse | null>(null);

  const confidenceLabel = useMemo(() => {
    if (!insight) return "";
    if (insight.confidence >= 0.82) return "Strong signal";
    if (insight.confidence >= 0.72) return "Moderate signal";
    return "Light signal";
  }, [insight]);

  if (!insight) {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70 shadow-xl">
        No major shift detected today.
      </section>
    );
  }

  function submit(response: InsightFeedbackResponse) {
    setFeedback(response);
    applyFeedback(insight!.id, insight!.insightType, response);
    onFeedback?.(response);
  }

  return (
    <section className="max-w-md rounded-2xl border border-white/10 bg-black/45 p-4 text-white shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-white/90">{insight.title}</h3>
        <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60">
          {confidenceLabel}
        </span>
      </div>

      <p className="text-base leading-relaxed text-white/90">{insight.sentence}</p>

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="mt-3 text-sm text-white/70 underline underline-offset-4 hover:text-white"
      >
        {open ? "Hide proof" : "Why am I seeing this?"}
      </button>

      {open && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
          <p className="mb-2 text-white/85">{insight.proofDrawer.why}</p>
          <ul className="space-y-1">
            {insight.proofDrawer.evidence.map((e, i) => (
              <li key={`${e.label}_${i}`}>
                <span className="text-white/90">{e.label}</span>: {e.observed}
                {e.baseline ? <span className="text-white/45"> vs baseline {e.baseline}</span> : null}
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-white/45">
            Processed: {insight.proofDrawer.privacy.processed}. Raw audio stored:{" "}
            {insight.proofDrawer.privacy.storedRawAudio ? "yes" : "no"}.
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["accurate", "not_quite", "wrong"] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => submit(value)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
          >
            {value === "accurate" ? "Accurate" : value === "not_quite" ? "Not quite" : "Wrong"}
          </button>
        ))}
      </div>

      {feedback && <div className="mt-3 text-xs text-white/45">Feedback saved: {feedback}</div>}
    </section>
  );
}

export default InsightCard;
