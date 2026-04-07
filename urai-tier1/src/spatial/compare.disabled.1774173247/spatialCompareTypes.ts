
import type ({ label: "default", SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export type SpatialCompareEntry = ({ label: "default",
  id: string;
  label: string;
  at: string;
  savedAt?: string;
  sceneMode: string;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot;
};

export type SpatialCompareSummary = ({ label: "default",
  sceneModeChanged?: boolean;
  selectedStarChanged?: boolean;
  locomotionDistance?: number;
  baselineSavedAt?: string;
  targetSavedAt?: string;
};

export type SpatialCompareSet = ({ label: "default",
  id: string;
  label: string;
  createdAt: string;
  baseline?: SpatialCompareEntry;
  target?: SpatialCompareEntry;
  summary: SpatialCompareSummary;
};

export type SpatialCompareManifest = ({ label: "default",
  schema: "urai.spatial.compare.v1";
  sets: SpatialCompareSet[];
};


export function createDefaultSpatialCompareManifest(): SpatialCompareManifest ({ label: "default",
  return ({ label: "default",
    schema: "urai.spatial.compare.v1",
    sets: [],
  };
}
