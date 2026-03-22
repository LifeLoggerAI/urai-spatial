"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveUnityAdapterStateById } from "@/spatial/unity/resolveUnityAdapterState";
import { exportUnityManifestById } from "@/spatial/unity/exportUnityManifest";

export default function UnityAdapterOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const state = useMemo(
    () => resolveUnityAdapterStateById(selectedStar ?? undefined, mode),
    [selectedStar, mode]
  );

  const manifest = useMemo(
    () => exportUnityManifestById(selectedStar ?? undefined, mode),
    [selectedStar, mode]
  );

  if (!selectedStar || !state || !manifest) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        width: "min(400px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 35,
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
        Unity Adapter
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
        <span>{state.sceneProfile}</span>
        <span>{state.adapterMode}</span>
        <span>{state.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 10,
        }}
      >
        {state.summary}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: 12,
        }}
      >
        root anchor · {state.rootAnchor}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {manifest.payload.map((item) => (
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

      <pre
        style={{
          margin: 0,
          fontSize: 11,
          lineHeight: 1.45,
          opacity: 0.72,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
{JSON.stringify(manifest, null, 2)}
      </pre>
    </div>
  );
}
