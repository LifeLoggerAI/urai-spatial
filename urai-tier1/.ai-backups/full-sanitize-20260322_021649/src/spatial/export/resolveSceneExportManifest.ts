import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContract";
import { resolveXRBridgeStateById } from "@/spatial/xr/resolveXRBridgeState";
import { resolveLifeMapIntelligenceById } from "@/spatial/intelligence/resolveLifeMapIntelligence";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type SceneExportManifest = {
  id: string;
  title: string;
  profile: "focus" | "replay";
  readiness: number;
  target: "web" | "webxr" | "unity" | "ar";
  anchor: string;
  payload: string[];
  summary: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveSceneExportManifestById(
  id: string | null | undefined,
  mode: string | null | undefined
): SceneExportManifest | undefined {
  if (!id) return undefined;

  const immersive = resolveImmersiveContractById(id, mode);
  const xr = resolveXRBridgeStateById(id, mode);
  const intel = resolveLifeMapIntelligenceById(id);
  const memory = resolveMemorySphereById(id);

  if (!immersive && !xr && !intel && !memory) return undefined;

  const profile = mode === "replay" ? "replay" : "focus";
  const target =
    immersive?.adapter === "webxr"
      ? "webxr"
      : immersive?.adapter === "unity"
      ? "unity"
      : immersive?.adapter === "ar"
      ? "ar"
      : "web";

  const readiness = clamp(
    Math.round(
      (immersive?.readiness ?? 40) * 0.55 +
      (xr?.readiness ?? 40) * 0.30 +
      (intel?.score ?? 40) * 0.15
    ),
    0,
    100
  );

  const title =
    memory?.title
      ? `${memory.title} Export`
      : "Scene Export Manifest";

  const anchor =
    immersive?.anchorLabel ??
    xr?.anchor ??
    memory?.chapter ??
    intel?.title ??
    "scene-anchor";

  const payload = [
    "selected-star-id",
    "camera-anchor",
    "memory-sphere",
    "narrative-layer",
    "cluster-signals",
    profile === "replay" ? "replay-state" : "focus-state",
    target,
  ];

  const summary =
    profile === "replay"
      ? "Replay scene is now exportable into adapter-ready payloads without changing the locked baseline."
      : "Focused scene is now exportable into adapter-ready payloads for downstream viewers and toolchains.";

  return {
    id,
    title,
    profile,
    readiness,
    target,
    anchor,
    payload,
    summary,
  };
}
