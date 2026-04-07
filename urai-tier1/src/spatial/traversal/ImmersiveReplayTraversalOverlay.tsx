
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveImmersiveReplayTraversalById } from "@/spatial/traversal/resolveImmersiveReplayTraversal";

export default function ImmersiveReplayTraversalOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const traversal = useMemo(
    () => resolveImmersiveReplayTraversalById(selectedStarId, mode),
    [selectedStarId, mode]
  );

  if (!selectedStarId || !traversal) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        top: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 37,
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
        Immersive Replay Traversal
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {traversal.title}
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
        <span>{traversal.modeLabel}</span>
        <span>{traversal.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: 8,
        }}
      >
        path · {traversal.pathLabel}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.84,
          marginBottom: 12,
        }}
      >
        {traversal.guidance}
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {traversal.nodes.map((node) => (
          <div
            key={node.id}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.3,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                opacity: 0.72,
              }}
            >
              {node.detail || "path detail pending"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
