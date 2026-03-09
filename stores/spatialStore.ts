import { create } from "zustand";

type SpatialMode = "lifemap" | "memory";

/**
 * The core state contract for URAI-Spatial Tier-1.
 *
 * This state is minimal and deterministic. The entire visual state of the
 * application must be reconstructable from these two properties alone.
 *
 * - spatialMode: Determines the primary view (the starfield or a memory).
 * - selectedStarId: The unique identifier for the currently active memory.
 *
 * All other visual properties (camera position, star glow, sphere visibility)
 * must be derived from this state, not stored within it.
 */
type SpatialState = {
  spatialMode: SpatialMode;
  selectedStarId: string | null;

  // --- ACTIONS ---

  /**
   * Sets the selected star.
   * Passing an ID automatically switches to "memory" mode.
   * Passing null clears the selection and returns to "lifemap" mode.
   */
  selectStar: (id: string | null) => void;

  /**
   * Explicitly sets the spatial mode. This should be used for transitions
   * that are not directly coupled to a star selection event.
   */
  setMode: (mode: SpatialMode) => void;
};

export const useSpatialStore = create<SpatialState>((set) => ({
  // --- INITIAL STATE ---
  spatialMode: "lifemap",
  selectedStarId: null,

  // --- ACTION IMPLEMENTATIONS ---
  selectStar: (id) =>
    set({
      selectedStarId: id,
      spatialMode: id ? "memory" : "lifemap",
    }),

  setMode: (mode) => set({ spatialMode: mode }),
}));