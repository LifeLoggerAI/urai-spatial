export type SpatialTimelineLensFocus =
  | "scene"
  | "selection"
  | "movement"
  | "balanced";

export type SpatialTimelineLens = {
  id: string;
  label: string;
  createdAt: string;
  source: "system" | "compare-set";
  compareSetId: string | null;
  focus: SpatialTimelineLensFocus;
  summary: string;
  baselineLabel: string | null;
  targetLabel: string | null;
};

export type SpatialLensManifest = {
  schema: "urai.spatial.lens.v1";
  activeLensId: string | null;
  lenses: SpatialTimelineLens[];
};


export function createSystemCurrentLens(): SpatialTimelineLens {
  return {
    id: "lens-current-runtime",
    label: "Current Runtime Lens",
    createdAt: new Date(0).toISOString(),
    source: "system",
    compareSetId: null,
    focus: "balanced",
    summary: "Live account-scoped spatial runtime view.",
    baselineLabel: null,
    targetLabel: null,
  };
}

export function createDefaultSpatialLensManifest(): SpatialLensManifest {
  const current = createSystemCurrentLens();
  return {
    schema: "urai.spatial.lens.v1",
    activeLensId: current.id,
    lenses: [current],
  };
}

export type SpatialLensId = string;
