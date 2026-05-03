import type { Insight } from "@/spatial/narrator/types";

export function MeaningOverlay({ insight }: { insight: Insight | null }) {
  if (!insight) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 28,
        top: 28,
        width: 280,
        padding: "12px 14px",
        borderRadius: 18,
        background: "rgba(2, 6, 15, 0.42)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.82)",
        pointerEvents: "none",
        zIndex: 19,
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>
        MEANING SIGNAL
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.4 }}>
        {insight.meaning}
      </div>
    </div>
  );
}
