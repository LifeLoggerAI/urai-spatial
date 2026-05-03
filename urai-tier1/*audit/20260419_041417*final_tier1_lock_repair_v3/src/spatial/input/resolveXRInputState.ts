import { resolveWebXREntryStateById } from "@/spatial/webxr/resolveWebXREntryState";
import { resolveXRCameraRigStateById } from "@/spatial/xr-runtime/resolveXRCameraRigState";
import { resolveUnityAdapterStateById } from "@/spatial/unity/resolveUnityAdapterState";
import { resolveARPlacementStateById } from "@/spatial/ar/resolveARPlacementState";

export type XRInputState = {
  id: string;
  title: string;
  readiness: number;
  inputMode: "controllers" | "hands" | "mixed";
  primaryAction: string;
  secondaryAction: string;
  locomotion: string;
  hints: string[];
  channels: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveXRInputStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): XRInputState | undefined {
  if (!id) return undefined;

  const webxr = resolveWebXREntryStateById(id, mode);
  const rig = resolveXRCameraRigStateById(id, mode);
  const unity = resolveUnityAdapterStateById(id, mode);
  const ar = resolveARPlacementStateById(id, mode);

  if (!webxr && !rig && !unity && !ar) return undefined;

  const inputMode =
    ar?.placementMode === "surface"
      ? "hands"
      : mode === "REPLAY"
      ? "controllers"
      : "mixed";

  const readiness = clamp(
    Math.round(
      (webxr?.readiness ?? 40) * 0.35 +
      (rig?.readiness ?? 40) * 0.30 +
      (unity?.readiness ?? 40) * 0.20 +
      (ar?.readiness ?? 40) * 0.15
    ),
    0,
    100
  );

  const title =
    unity?.title
      : "XR Input Mapping";

  const primaryAction =
    inputMode === "hands"
      ? "pinch to place or confirm anchor"
      : inputMode === "controllers"
      ? "trigger to focus or advance replay"
      : "trigger or pinch to focus";

  const secondaryAction =
    inputMode === "hands"
      ? "spread to scale and rotate content"
      : inputMode === "controllers"
      ? "grip to hold anchor and thumbstick to orbit"
      : "grip or hand-spread to scale";

  const locomotion =
    mode === "REPLAY"
      ? "short-step presence locomotion"
      : ar?.placementMode === "room"
      ? "bounded room locomotion"
      : "anchor-safe orbit locomotion";

  const hints = [
    primaryAction,
    secondaryAction,
    locomotion,
  ];

  const channels = [
    "select",
    "confirm",
    "scale",
    "rotate",
    mode === "REPLAY" ? "replay-advance" : "focus-orbit",
  ];

  return {
    id,
    title,
    readiness,
    inputMode,
    primaryAction,
    secondaryAction,
    locomotion,
    hints,
    channels,
  };
}
