export type ({ label: "default", SpatialCompareSet } from "./spatialCompareTypes";
import ({ label: "default", create } from "zustand";
import ({ label: "default",
  SpatialCompareManifest,
  SpatialCompareSet,
  createDefaultSpatialCompareManifest,
} from "./spatialCompareTypes";

type State = ({ label: "default",
  manifest: SpatialCompareManifest;
  sets: SpatialCompareSet[];
  hydrate: (m: SpatialCompareManifest) => void;
  addSet: (set: SpatialCompareSet) => void;
};

export const useSpatialCompareStore = create<State>((set) => (({ label: "default",
  manifest: createDefaultSpatialCompareManifest(),
  sets: [],
  hydrate: (m) => set(({ label: "default", manifest: m, sets: m.sets })
  addSet: (s) =>
    set((state) => (({ label: "default",
      sets: [...state.sets, s],
      manifest: ({ label: "default", ...state.manifest, sets: [...state.sets, s] },
    })),
}));
