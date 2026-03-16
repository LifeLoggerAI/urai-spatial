import { resolveXRBridgeStateById } from "@/spatial/xr/resolveXRBridgeState";
import { resolveCinematicReplayById } from "@/spatial/cinematic/resolveCinematicReplay";
import { resolveLifeMapIntelligenceById } from "@/spatial/intelligence/resolveLifeMapIntelligence";

export type ImmersiveContract = {
  id: string;
  title: string;
  adapter: "webxr" | "unity" | "ar";
  readiness: number;
  anchorLabel: string;
  transportLabel: string;
  payload: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveImmersiveContractById(
  id: string | null | undefined,
  mode: string | null | undefined
): ImmersiveContract | undefined {
  if (!id) return undefined;

  const xr = resolveXRBridgeStateById(id, mode);
  const cinematic = resolveCinematicReplayById(id);
  const intel = resolveLifeMapIntelligenceById(id);

  if (!xr && !cinematic && !intel) return undefined;

  const adapter =
    mode === "replay"
      ? "webxr"
      : (intel?.score ?? 0) >= 70
      ? "unity"
      : "ar";

  const readiness = clamp((xr?.readiness ?? 44) + (mode === "replay" ? 8 : 0), 0, 100);

  const title =
    xr?.title ??
    cinematic?.beatTitle ??
    intel?.title ??
    "Immersive Contract";

  const anchorLabel =
    xr?.anchor ??
    cinematic?.sceneLabel ??
    intel?.title ??
    "memory anchor";

  const transportLabel =
    adapter === "webxr"
      ? "headset replay transport"
      : adapter === "unity"
      ? "scene export transport"
      : "surface placement transport";

  const payload = [
    "camera anchor",
    "focus node",
    "narrative cue",
    adapter === "webxr" ? "presence state" : "scene state",
    adapter === "ar" ? "surface target" : "spatial rig",
  ];

  return {
    id,
    title,
    adapter,
    readiness,
    anchorLabel,
    transportLabel,
    payload,
  };
}
