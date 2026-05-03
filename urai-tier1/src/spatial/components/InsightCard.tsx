"use client";

import React, { useMemo, useState } from "react";
import type { UraiInsight } from "@/lib/urai-insights/types";

type FeedbackValue = "helpful" | "not_helpful";

type InsightCardProps = {
  insight?: UraiInsight;
  onFeedback?: (response: any) => void;
};

type ProofDrawer = {
  why?: string;
  evidence?: string[];
};

type SafeInsight = UraiInsight & {
  id: string;
  title?: string;
  summary?: string;
  confidence?: number;
  proofDrawer?: ProofDrawer;
};

export function InsightCard({ insight, onFeedback }: InsightCardProps) {
  const [open, setOpen] = useState(false);

  const safeInsight = useMemo<SafeInsight>(() => {
    const source = (insight ?? {}) as any;

    return {
      id: String(source.id ?? "demo-insight"),
      title: String(source.title ?? "Insight ready"),
      summary: String(source.summary ?? "URAI found a pattern worth reviewing."),
      confidence: typeof source.confidence === "number" ? source.confidence : 0.72,
      proofDrawer: {
        why:
          source.proofDrawer?.why ??
          "This insight is based on available memory, mood, and pattern signals.",
        evidence: Array.isArray(source.proofDrawer?.evidence)
          ? source.proofDrawer.evidence
          : ["Memory signal", "Pattern signal", "Replay signal"],
      },
      ...source,
    };
  }, [insight]);

  const sendFeedback = (feedback: FeedbackValue) => {
    onFeedback?.({
      insightId: safeInsight.id,
      response: feedback,
      value: feedback,
      createdAt: Date.now(),
    });
  };

  const proofDrawer = safeInsight.proofDrawer ?? {
    why: "URAI connected this insight to available signals.",
    evidence: [],
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            {safeInsight.title ?? "Insight ready"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {safeInsight.summary ?? "URAI found a pattern worth reviewing."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
        >
          {open ? "Hide proof" : "Why?"}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
          <p className="mb-2 text-white/85">{proofDrawer.why}</p>
          <ul className="space-y-1">
            {(proofDrawer.evidence ?? []).map((item, index) => (
              <li key={String(index)}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => sendFeedback("helpful")}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
        >
          Helpful
        </button>
        <button
          type="button"
          onClick={() => sendFeedback("not_helpful")}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
        >
          Not now
        </button>
      </div>
    </article>
  );
}

export default InsightCard;
