export type SpatialCompareSide = {
  id: string;
  label: string;
  starId?: string | null;
  snapshotId?: string | null;
};

export type SpatialCompareSummary = {
  title?: string;
  notes?: string;
  delta?: string;
  sceneModeChanged?: boolean;
  selectedStarChanged?: boolean;
  locomotionDistance?: number;
  [key: string]: unknown;
};

export type SpatialCompareSet = {
  id: string;
  label: string;
  createdAt: string;
  baseline: SpatialCompareSide;
  target: SpatialCompareSide;
  summary: SpatialCompareSummary;
};

export function toSpatialCompareSetContract(input: unknown): SpatialCompareSet {
  const value = (input ?? {}) as Record<string, unknown>;
  const baselineValue = (value.baseline ?? {}) as Record<string, unknown>;
  const targetValue = (value.target ?? {}) as Record<string, unknown>;
  const summaryValue = (value.summary ?? {}) as Record<string, unknown>;

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : `compare-${Date.now()}`,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label
        : "Compare Set",
    createdAt:
      typeof value.createdAt === "string" && value.createdAt.trim()
        ? value.createdAt
        : new Date(0).toISOString(),
    baseline: {
      id:
        typeof baselineValue.id === "string" && baselineValue.id.trim()
          ? baselineValue.id
          : "baseline",
      label:
        typeof baselineValue.label === "string" && baselineValue.label.trim()
          ? baselineValue.label
          : "Baseline",
      starId: typeof baselineValue.starId === "string" ? baselineValue.starId : null,
      snapshotId: typeof baselineValue.snapshotId === "string" ? baselineValue.snapshotId : null,
    },
    target: {
      id:
        typeof targetValue.id === "string" && targetValue.id.trim()
          ? targetValue.id
          : "target",
      label:
        typeof targetValue.label === "string" && targetValue.label.trim()
          ? targetValue.label
          : "Target",
      starId: typeof targetValue.starId === "string" ? targetValue.starId : null,
      snapshotId: typeof targetValue.snapshotId === "string" ? targetValue.snapshotId : null,
    },
    summary: {
      ...summaryValue,
      title: typeof summaryValue.title === "string" ? summaryValue.title : undefined,
      notes: typeof summaryValue.notes === "string" ? summaryValue.notes : undefined,
      delta: typeof summaryValue.delta === "string" ? summaryValue.delta : undefined,
      sceneModeChanged:
        typeof summaryValue.sceneModeChanged === "boolean"
          ? summaryValue.sceneModeChanged
          : false,
      selectedStarChanged:
        typeof summaryValue.selectedStarChanged === "boolean"
          ? summaryValue.selectedStarChanged
          : false,
      locomotionDistance:
        typeof summaryValue.locomotionDistance === "number"
          ? summaryValue.locomotionDistance
          : 0,
    },
  };
}

export function toSpatialCompareSetContractList(input: unknown): SpatialCompareSet[] {
  return Array.isArray(input) ? input.map(toSpatialCompareSetContract) : [];
}

export const SPATIAL_COMPARE_STORAGE_KEY = "urai_compare_manifest";
export const SPATIAL_COMPARE_MAX_SETS = 24;

export type SpatialCompareEntry = SpatialCompareSet;

export type SpatialCompareManifest = {
  sets: SpatialCompareSet[];
};

export function createDefaultSpatialCompareManifest(): SpatialCompareManifest {
  return { sets: [] };
}
