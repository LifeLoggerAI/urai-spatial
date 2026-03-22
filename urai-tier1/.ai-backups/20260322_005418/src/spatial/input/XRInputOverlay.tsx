"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveXRInputStateById } from "@/spatial/input/resolveXRInputState";

export default function XRInputOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const input = useMemo(
    () => resolveXRInputStateById(selectedStar ?? undefined, mode),
    [selectedStar, mode]
  );

  if (!selectedStar || !input) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(400px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 36,
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
        XR Input Mapping
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {input.title}
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
        <span>{input.inputMode}</span>
        <span>{input.readiness}</span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {input.hints.map((hint) => (
          <div
            key={hint}
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              opacity: 0.82,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {hint}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {input.channels.map((item) => (
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
    </div>
  );
}
