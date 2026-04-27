import { resolveSceneExportManifestById } from "@/spatial/export/resolveSceneExportManifest";
import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContract";

export type WebXREntryState = {
  id: string;
  title: string;
  modeLabel: string;
  summary: string;
  readiness: number;
  targetMode: "immersive-vr" | "immersive-ar";
  features: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveWebXREntryStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): WebXREntryState | undefined {
  if (!id) return undefined;

  const manifest = resolveSceneExportManifestById(id, mode);
  const immersive = resolveImmersiveContractById(id, mode);

  if (!manifest && !immersive) return undefined;

  const targetMode =
    manifest?.target === "ar" ? "immersive-ar" : "immersive-vr";

  const readiness = clamp(
    Math.round((manifest?.readiness ?? 40) * 0.65 + (immersive?.readiness ?? 40) * 0.35),
    0,
    100
  );

  const title =
    manifest?.title
      : "WebXR Scene Entry";

  const modeLabel =
    targetMode === "immersive-ar" ? "AR Entry" : "VR Entry";

  const summary =
    targetMode === "immersive-ar"
      ? "WebXR entry contract is ready for surface-aware immersive placement when the browser supports AR sessions."
      : "WebXR entry contract is ready for immersive replay and spatial presence when the browser supports VR sessions.";

  const features = [
    "local-floor",
    "bounded-floor",
    "hand-tracking",
    targetMode === "immersive-ar" ? "hit-test" : "layers",
  ];

  return {
    id,
    title,
    modeLabel,
    summary,
    readiness,
    targetMode,
    features,
  };
}
