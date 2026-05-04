import type { NarratorInsight } from "@/lib/types";

interface Props {
  insight: NarratorInsight;
}

export default function NarratorInsightCard({ insight }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-xs uppercase text-white/40 mb-1">Narrator</div>
      <div className="text-lg font-semibold text-white mb-2">{insight.title}</div>
      <p className="text-sm text-white/80 leading-relaxed">{insight.body}</p>
      {insight.isMock && (
        <div className="mt-3 text-[10px] text-yellow-400">mock insight</div>
      )}
    </div>
  );
}
