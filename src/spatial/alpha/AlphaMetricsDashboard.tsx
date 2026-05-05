"use client";

import { useEffect, useState } from "react";
import { exportAlphaMetrics, getAlphaMetricsSummary, type UraiAlphaMetricsSummary } from "./alphaMetrics";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function numberOrDash(value: number | null) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function statusFor(summary: UraiAlphaMetricsSummary) {
  const warnings: string[] = [];
  if (summary.tooMuchRate > 0.2) warnings.push("Too much rate is above 20% - reduce story intensity.");
  if (summary.completionRate > 0 && summary.completionRate < 0.6) warnings.push("Story completion is below 60% - shorten or soften stories.");
  if (summary.averageTrust !== null && summary.averageTrust < 4) warnings.push("Trust score is below target - reduce interruption and increase user control.");
  if (summary.averageFeltUnderstanding !== null && summary.averageFeltUnderstanding < 4) warnings.push("Felt understanding is below target - improve context fit.");
  return warnings;
}

export default function AlphaMetricsDashboard() {
  const [summary, setSummary] = useState<UraiAlphaMetricsSummary | null>(null);
  const [exportText, setExportText] = useState("");

  useEffect(() => {
    const refresh = () => setSummary(getAlphaMetricsSummary());
    refresh();
    const interval = window.setInterval(refresh, 1500);
    return () => window.clearInterval(interval);
  }, []);

  if (!summary) return null;

  const warnings = statusFor(summary);
  const cards = [
    ["Events", String(summary.totalEvents)],
    ["Completion", percent(summary.completionRate)],
    ["Calming", percent(summary.calmingRate)],
    ["Resonance", percent(summary.resonanceRate)],
    ["Too Much", percent(summary.tooMuchRate)],
    ["Voice Enable", percent(summary.voiceEnableRate)],
    ["Understanding", numberOrDash(summary.averageFeltUnderstanding)],
    ["Trust", numberOrDash(summary.averageTrust)],
    ["Reg Delta", numberOrDash(summary.averageRegulationDelta)],
  ];

  return (
    <section className="rounded-2xl bg-black/50 text-white p-4 space-y-4 backdrop-blur-md border border-white/10">
      <div>
        <h2 className="text-lg font-semibold">URAI Alpha Metrics</h2>
        <p className="text-xs opacity-70">Live local alpha dashboard for story, feedback, trust, and safety signals.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/10 p-3">
            <div className="text-[10px] uppercase opacity-60">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {warnings.length ? (
        <div className="rounded-xl bg-amber-500/20 border border-amber-300/30 p-3 text-xs space-y-1">
          <div className="font-semibold">Safety / UX warnings</div>
          {warnings.map((warning) => (
            <div key={warning}>- {warning}</div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-300/20 p-3 text-xs">
          Alpha metrics are within target thresholds.
        </div>
      )}

      <div className="flex gap-2">
        <button className="rounded-full bg-white text-black px-3 py-1 text-xs font-semibold" onClick={() => setSummary(getAlphaMetricsSummary())}>
          Refresh
        </button>
        <button className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={() => setExportText(exportAlphaMetrics())}>
          Export JSON
        </button>
      </div>

      {exportText ? (
        <textarea className="w-full h-40 rounded-xl bg-black/60 p-2 text-[10px] font-mono" readOnly value={exportText} />
      ) : null}
    </section>
  );
}
