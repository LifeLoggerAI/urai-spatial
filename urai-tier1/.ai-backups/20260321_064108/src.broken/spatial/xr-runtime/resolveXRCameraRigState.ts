import { resolveWebXREntryStateById } from "@/spatial/webxr/resolveWebXREntryState";
import { resolveSceneExportManifestById } from "@/spatial/export/resolveSceneExportManifest";
import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContract";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type XRCameraRigState = {
  id: string;
  title: string;
  profile: "focus" | "replay";
  rigType: "anchored" | "drift" | "presence";
  readiness: number;
  anchorLabel: string;
  positionHint: string;
  orientationHint: string;
  presenceLabel: string;
  channels: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveXRCameraRigStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): XRCameraRigState | undefined {
  if (!id) return undefined;

  const xr = resolveWebXREntryStateById(id, mode);
  const manifest = resolveSceneExportManifestById(id, mode);
  const immersive = resolveImmersiveContractById(id, mode);
  const memory = resolveMemorySphereById(id);

  if (!xr && !manifest && !immersive && !memory) return undefined;

  const profile = mode === "replay" ? "replay" : "focus";
  const rigType =
    mode === "replay"
      ? "presence"
      : manifest?.target === "ar"
      ? "anchored"
      : "drift";

  const readiness = clamp(
    Math.round(
      (xr?.readiness ?? 40) * 0.45 +
      (manifest?.readiness ?? 40) * 0.35 +
      (immersive?.readiness ?? 40) * 0.20
    ),
    0,
    100
  );

  const title =
    memory?.title
      ? `${memory.title} XR Rig`
      : "XR Camera Rig";

  const anchorLabel =
    manifest?.anchor ??
    immersive?.anchorLabel ??
    memory?.chapter ??
    "xr-anchor";

  const positionHint =
    rigType === "anchored"
      ? "lock camera to local anchor and keep horizon stable"
      : rigType === "presence"
      ? "hold near subject, tighten depth, preserve replay framing"
      : "allow slow spatial drift around focus node";

  const orientationHint =
    profile === "replay"
      ? "favor forward gaze and steady narrative framing"
      : "favor soft orbit and memory-adjacent discovery";

  const presenceLabel =
    rigType === "presence"
      ? "immersive subject presence"
      : rigType === "anchored"
      ? "surface-aligned presence"
      : "free spatial presence";

  const channels = [
    "camera-root",
    "head-pose",
    "anchor-node",
    "focus-depth",
    profile === "replay" ? "replay-presence" : "lifemap-presence",
  ];

  return {
    id,
    title,
    profile,
    rigType,
    readiness,
    anchorLabel,
    positionHint,
    orientationHint,
    presenceLabel,
    channels,
  };
}
