import { resolveSceneExportManifestById } from "@/spatial/export/resolveSceneExportManifestById";
import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContractById";

export type WebXREntryTargetMode = "immersive-vr" | "immersive-ar";

export type WebXREntryState = {
  id: string;
  title: string;
  modeLabel: string;
  summary: string;
  readiness: number;
  targetMode: WebXREntryTargetMode;
  features: XRSessionFeature[];
};

const DEFAULT_FEATURES: XRSessionFeature[] = ["local-floor", "bounded-floor", "hand-tracking"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSceneMode(mode: string | null | undefined): string {
  return mode || "HOME";
}

function resolveTargetMode(mode: string | null | undefined): WebXREntryTargetMode {
  const normalized = normalizeSceneMode(mode).toLowerCase();
  return normalized.includes("ar") ? "immersive-ar" : "immersive-vr";
}

export function resolveWebXREntryStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): WebXREntryState | undefined {
  if (!id) return undefined;

  const sceneMode = normalizeSceneMode(mode);
  const manifest = resolveSceneExportManifestById(id, sceneMode);
  const immersive = resolveImmersiveContractById(id, sceneMode);

  if (!manifest && !immersive) return undefined;

  const targetMode = resolveTargetMode(sceneMode);
  const readiness = clamp(
    Math.round((immersive?.readiness ?? 40) * 0.7 + (manifest ? 30 : 0)),
    0,
    100
  );

  return {
    id,
    title: `${manifest?.title ?? immersive?.title ?? "Selected scene"} WebXR`,
    modeLabel: targetMode === "immersive-ar" ? "AR Entry" : "VR Entry",
    summary:
      targetMode === "immersive-ar"
        ? "WebXR AR entry is gated behind real browser support and explicit session permission. Unsupported devices stay in the spatial web fallback."
        : "WebXR VR entry is gated behind real browser support and explicit session permission. Unsupported devices stay in the spatial web fallback.",
    readiness,
    targetMode,
    features: targetMode === "immersive-ar" ? [...DEFAULT_FEATURES, "hit-test"] : [...DEFAULT_FEATURES, "layers"],
  };
}

export function resolveWebXREntryState(enabled: boolean): { label: string; enabled: boolean } {
  return {
    label: "WebXR Scene Entry",
    enabled,
  };
}
