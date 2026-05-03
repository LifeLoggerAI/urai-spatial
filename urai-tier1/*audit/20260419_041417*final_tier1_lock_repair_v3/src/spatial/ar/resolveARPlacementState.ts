import { resolveWebXREntryStateById } from "@/spatial/webxr/resolveWebXREntryState";
import { resolveSceneExportManifestById } from "@/spatial/export/resolveSceneExportManifest";
import { resolveXRCameraRigStateById } from "@/spatial/xr-runtime/resolveXRCameraRigState";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type ARPlacementState = {
  id: string;
  title: string;
  readiness: number;
  placementMode: "surface" | "tabletop" | "room";
  anchorLabel: string;
  surfaceHint: string;
  distanceHint: string;
  stabilityHint: string;
  channels: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveARPlacementStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): ARPlacementState | undefined {
  if (!id) return undefined;

  const xr = resolveWebXREntryStateById(id, mode);
  const manifest = resolveSceneExportManifestById(id, mode);
  const rig = resolveXRCameraRigStateById(id, mode);
  const memory = resolveMemorySphereById(id);

  if (!xr && !manifest && !rig && !memory) return undefined;

  const placementMode =
    manifest?.target === "ar"
      ? "surface"
      : mode === "REPLAY"
      ? "room"
      : "tabletop";

  const readiness = clamp(
    Math.round(
      (manifest?.readiness ?? 40) * 0.40 +
      (rig?.readiness ?? 40) * 0.35 +
      (xr?.readiness ?? 40) * 0.25
    ),
    0,
    100
  );

  const title =
    memory?.title
      : "AR Placement";

  const anchorLabel =
    manifest?.anchor ??
    rig?.anchorLabel ??
    memory?.chapter ??
    "ar-anchor";

  const surfaceHint =
    placementMode === "surface"
      ? "lock content to detected plane and preserve anchor stability"
      : placementMode === "room"
      ? "stage content at human-scale distance with replay-safe framing"
      : "shrink content for stable tabletop placement and near-field viewing";

  const distanceHint =
    placementMode === "room"
      ? "preferred distance: 1.5m to 2.5m"
      : placementMode === "surface"
      ? "preferred distance: 0.8m to 1.6m"
      : "preferred distance: 0.4m to 0.9m";

  const stabilityHint =
    placementMode === "surface"
      ? "favor hit-test confidence and low drift"
      : placementMode === "room"
      ? "favor anchored presence and low motion sickness"
      : "favor compact placement and quick reacquire";

  const channels = [
    "surface-target",
    "anchor-node",
    "scale-profile",
    "placement-distance",
    placementMode === "room" ? "presence-volume" : "plane-fit",
  ];

  return {
    id,
    title,
    readiness,
    placementMode,
    anchorLabel,
    surfaceHint,
    distanceHint,
    stabilityHint,
    channels,
  };
}
