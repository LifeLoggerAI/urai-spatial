import type { NarratorLine } from "@/spatial/narrator/types";

export function NarratorOverlay({ line }: { line: NarratorLine | null }) {
  if (!line) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: line.moment === "replay_enter" || line.moment === "replay_hold" ? 44 : 32,
        transform: "translateX(-50%)",
        maxWidth: 680,
        padding: "10px 16px",
        borderRadius: 18,
        background: "rgba(2, 6, 15, 0.54)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.88)",
        fontSize: 14,
        lineHeight: 1.45,
        letterSpacing: "0.01em",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 20,
        backdropFilter: "blur(10px)",
      }}
    >
      {line.text}
    </div>
  );
}
