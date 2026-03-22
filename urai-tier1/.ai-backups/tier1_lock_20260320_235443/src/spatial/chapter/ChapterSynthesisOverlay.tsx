"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveChapterSynthesisById } from "@/spatial/chapter/resolveChapterSynthesis";

export default function ChapterSynthesisOverlay() {
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const state = useMemo(
    () => resolveChapterSynthesisById(selectedStar ?? undefined),
    [selectedStar]
  );

  if (!selectedStar || !state) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(430px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 44,
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
        Chapter Synthesis
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {state.title}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          fontSize: 11,
          lineHeight: 1,
          marginBottom: 12,
          opacity: 0.86,
        }}
      >
        <span>{state.chapterLabel}</span>
        <span>{state.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 12,
        }}
      >
        {state.summary}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.78 }}>chapter count · {state.chapterCount}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>dominant signal · {state.dominantSignal ?? "n/a"}</div>
      </div>

      {state.relatedTimebands.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: state.relatedEmotions.length > 0 ? 12 : 0,
          }}
        >
          {state.relatedTimebands.map((item) => (
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

      {state.relatedEmotions.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {state.relatedEmotions.map((item) => (
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
