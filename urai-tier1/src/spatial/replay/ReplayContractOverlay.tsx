"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveReplaySceneFromSelectedStar } from "@/spatial/replay/resolveReplayScene";

import type { SelectedStar } from "@/spatial/state/selectedStarContract";
type LooseRecord = Record<string, unknown>;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export default function ReplayContractOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const replay = useMemo(
    () => resolveReplaySceneFromSelectedStar(selectedStar as LooseRecord | null | undefined),
    [selectedStar]
  ) as LooseRecord | undefined;

  if (mode !== "replay" || !selectedStar || !replay) return null;

  const title =
    str(replay.title) ??
    str(replay.label) ??
    str((selectedStar as LooseRecord).title) ??
    str((selectedStar as LooseRecord).label) ??
    "Memory Replay";

  const subtitleParts = [str(replay.chapter), str(replay.timeband)].filter(
    (value): value is string => Boolean(value)
  );

  const subtitle =
    str(replay.subtitle) ??
    (subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Canonical replay");

  const description =
    str(replay.description) ??
    str(replay.summary) ??
    "Replay is now resolving from the real memory contract.";

  const accent =
    str(replay.color) ??
    str((selectedStar as LooseRecord).color) ??
    "rgba(255,255,255,0.92)";

  const meta = [
    str(replay.chapter),
    str(replay.timeband),
    str(replay.emotion),
    str(replay.nodeId),
  ].filter((value): value is string => Boolean(value));

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "linear-gradient(180deg, rgba(10,14,24,0.86), rgba(6,10,18,0.92))",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.94)",
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.66,
          marginBottom: 8,
        }}
      >
        Replay Contract
      </div>

      <div
        style={{
          width: 56,
          height: 2,
          borderRadius: 999,
          background: accent,
          opacity: 0.95,
          marginBottom: 12,
        }}
      />

      <div
        style={{
          fontSize: 22,
          lineHeight: 1.1,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 13,
          opacity: 0.72,
          marginBottom: 10,
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          opacity: 0.88,
        }}
      >
        {description}
      </div>

      {meta.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 14,
          }}
        >
          {meta.map((item) => (
            <span
              key={item}
              style={{
                fontSize: 11,
                lineHeight: 1,
                padding: "7px 9px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                opacity: 0.84,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
