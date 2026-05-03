
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

function toneColor(color?: string) {
  return color ?? "rgba(255,255,255,0.92)";
}

export default function MemorySphereOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const detail = useMemo(
    () => resolveMemorySphereById(selectedStarId),
    [selectedStarId]
  );

  if (!selectedStarId || !detail) return null;
  if (mode === "REPLAY") return null;

  const meta = [
    detail.chapter,
    detail.timeband,
    detail.emotion,
  ].filter((value): value is string => Boolean(value));

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.84), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 24,
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
        Memory Sphere
      </div>

      <div
        style={{
          width: 64,
          height: 2,
          borderRadius: 999,
          background: toneColor(detail.color),
          opacity: 0.95,
          marginBottom: 12,
        }}
      />

      <div
        style={{
          fontSize: 24,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {detail.title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: meta.length > 0 ? 12 : 0,
        }}
      >
        {detail.summary}
      </div>

      {meta.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: detail.tags.length > 0 ? 10 : 0,
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

      {detail.tags.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {detail.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                lineHeight: 1,
                padding: "7px 9px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                opacity: 0.76,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
