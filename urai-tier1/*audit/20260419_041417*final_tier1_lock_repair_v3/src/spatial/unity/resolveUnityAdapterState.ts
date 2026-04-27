import { resolveSceneExportManifestById } from "@/spatial/export/resolveSceneExportManifest";
import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContract";
import { resolveXRCameraRigStateById } from "@/spatial/xr-runtime/resolveXRCameraRigState";
import { resolveARPlacementStateById } from "@/spatial/ar/resolveARPlacementState";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type UnityAdapterState = {
  id: string;
  title: string;
  readiness: number;
  sceneProfile: "FOCUS" | "REPLAY";
  adapterMode: "scene-kit" | "replay-kit" | "ar-kit";
  rootAnchor: string;
  summary: string;
  payload: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveUnityAdapterStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): UnityAdapterState | undefined {
  if (!id) return undefined;

  const manifest = resolveSceneExportManifestById(id, mode);
  const immersive = resolveImmersiveContractById(id, mode);
  const rig = resolveXRCameraRigStateById(id, mode);
  const ar = resolveARPlacementStateById(id, mode);
  const memory = resolveMemorySphereById(id);

  if (!manifest && !immersive && !rig && !ar && !memory) return undefined;

  const sceneProfile = mode === "REPLAY" ? "REPLAY" : "FOCUS";

  const adapterMode =
    manifest?.target === "ar"
      ? "ar-kit"
      : sceneProfile === "REPLAY"
      ? "replay-kit"
      : "scene-kit";

  const readiness = clamp(
    Math.round(
      (manifest?.readiness ?? 40) * 0.40 +
      (immersive?.readiness ?? 40) * 0.20 +
      (rig?.readiness ?? 40) * 0.20 +
      (ar?.readiness ?? 40) * 0.20
    ),
    0,
    100
  );

  const title =
    memory?.title
      : "Unity Adapter";

  const rootAnchor =
    manifest?.anchor ??
    rig?.anchorLabel ??
    ar?.anchorLabel ??
    memory?.chapter ??
    "unity-root-anchor";

  const summary =
    adapterMode === "ar-kit"
      ? "Scene payload is ready for Unity AR composition using anchor, scale, and placement channels."
      : adapterMode === "replay-kit"
      ? "Replay payload is ready for Unity cinematic sequencing using anchor, camera, and narrative channels."
      : "Focused scene payload is ready for Unity scene composition and adjacency-aware navigation.";

  const payload = [
    "scene-root",
    "anchor-node",
    "camera-rig",
    "memory-sphere",
    "narrative-layer",
    adapterMode === "replay-kit" ? "replay-timeline" : "focus-state",
    adapterMode,
  ];

  return {
    id,
    title,
    readiness,
    sceneProfile,
    adapterMode,
    rootAnchor,
    summary,
    payload,
  };
}
