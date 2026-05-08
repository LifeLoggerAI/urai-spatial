"use client";

import { useMemo, useState } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveUnityAdapterStateById } from "@/spatial/unity/resolveUnityAdapterState";
import { exportUnityManifestById } from "@/spatial/unity/exportUnityManifest";

const PUBLIC_MANIFEST_FILENAME = "URAI-Spatial-Demo-Manifest.json";
const PUBLIC_TIER_LOCK_BUNDLE_FILENAME = "URAI-Tier-Lock-Bundle.json";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UnityAdapterOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolveUnityAdapterStateById(selectedStarId ?? "", mode),
    [selectedStarId, mode]
  );

  const manifest = useMemo(
    () => exportUnityManifestById(selectedStarId ?? "", mode),
    [selectedStarId, mode]
  );

  const publicDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const showDemoExportControls = process.env.NEXT_PUBLIC_SHOW_DEMO_EXPORT_CONTROLS === "true";
  const shouldHideExportControls = publicDemoMode && !showDemoExportControls;

  const [status, setStatus] = useState("idle");

  function handleExportManifest() {
    if (!manifest) return;
    downloadBlob(
      PUBLIC_MANIFEST_FILENAME,
      new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })
    );
    setStatus("XR manifest exported.");
  }

  function handleExportTierLockBundle() {
    if (!manifest || !state) return;
    const bundle = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sceneId: manifest.sceneId,
      rootAnchor: manifest.rootAnchor,
      adapterMode: manifest.adapterMode,
      readiness: manifest.readiness,
      sceneProfile: state.sceneProfile,
      selectedStarId,
      exportControlsHiddenInPublicDemo: shouldHideExportControls,
      payload: manifest.payload,
      policy: {
        source: "URAI Spatial Tier Lock",
        allowPublicDemoExport: !shouldHideExportControls,
        requiresSelectedStar: true,
      },
    };
    downloadBlob(
      PUBLIC_TIER_LOCK_BUNDLE_FILENAME,
      new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" })
    );
    setStatus("Tier-lock bundle exported.");
  }

  if (!selectedStarId || !state || !manifest) return null;

  return (
    <div style={{ position: "absolute", right: 24, bottom: 24, width: "min(400px, calc(100vw - 32px))", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))", boxShadow: "0 18px 60px rgba(0,0,0,0.32)", backdropFilter: "blur(12px)", color: "rgba(255,255,255,0.95)", zIndex: 35, pointerEvents: "none" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.66, marginBottom: 8 }}>Unity Adapter</div>
      <div style={{ fontSize: 20, lineHeight: 1.08, fontWeight: 600, marginBottom: 10 }}>{state.title}</div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", fontSize: 11, lineHeight: 1, marginBottom: 12, opacity: 0.86 }}>
        <span>{state.sceneProfile}</span><span>{state.adapterMode}</span><span>{state.readiness}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.86, marginBottom: 10 }}>{state.summary}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.74, marginBottom: 12 }}>anchor ready</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{manifest.payload.map((item) => (<span key={item} style={{ fontSize: 11, lineHeight: 1, padding: "7px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", opacity: 0.84 }}>{item}</span>))}</div>
      {!shouldHideExportControls ? (
        <div style={{ display: "grid", gap: 8, pointerEvents: "auto" }}>
          <button type="button" onClick={handleExportManifest}>Export XR manifest</button>
          <button type="button" onClick={handleExportTierLockBundle}>Export tier-lock bundle</button>
          <div style={{ fontSize: 12, opacity: 0.8 }}>status: {status}</div>
        </div>
      ) : null}
    </div>
  );
}
