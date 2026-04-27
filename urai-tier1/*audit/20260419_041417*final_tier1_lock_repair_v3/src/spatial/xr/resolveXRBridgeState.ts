import { resolveLifeMapIntelligenceById } from "@/spatial/intelligence/resolveLifeMapIntelligence";
import { resolveCinematicReplayById } from "@/spatial/cinematic/resolveCinematicReplay";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type XRBridgeState = {
  id: string;
  title: string;
  readiness: number;
  modeLabel: string;
  summary: string;
  channels: string[];
  anchor?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveXRBridgeStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): XRBridgeState | undefined {
  if (!id) return undefined;

  const intel = resolveLifeMapIntelligenceById(id);
  const cinematic = resolveCinematicReplayById(id);
  const memory = resolveMemorySphereById(id);

  if (!intel && !cinematic && !memory) return undefined;

  const base = intel?.score ?? 42;
  const replayBoost = mode === "REPLAY" ? 12 : 0;
  const intensityBoost = typeof memory?.intensity === "number" ? Math.round(memory.intensity * 3) : 0;
  const readiness = clamp(base + replayBoost + intensityBoost, 0, 100);

  const modeLabel =
    mode === "REPLAY"
      ? "XR Replay Bridge"
      : "XR Spatial Bridge";

  const title =
    memory?.title
      : "XR Bridge";

  const summary =
    mode === "REPLAY"
      ? "Replay staging is now mappable into immersive camera and presence layers."
      : "Focused memory state is now mappable into immersive navigation and adjacency layers.";

  const channels = [
    "camera anchor",
    "memory sphere",
    "narrative layer",
    mode === "REPLAY" ? "cinematic replay" : "lifemap focus",
  ];

  return {
    id,
    title,
    readiness,
    modeLabel,
    summary,
    channels,
    anchor: memory?.chapter ?? cinematic?.sceneLabel ?? intel?.title,
  };
}
