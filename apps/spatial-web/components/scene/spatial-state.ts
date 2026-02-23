import { create } from "zustand"

export type SpatialMode =
  | "home"
    | "lifemap"
      | "chat"
        | "ground"
          | "replay"

          interface SpatialState {
            mode: SpatialMode
              transitioning: boolean
                setMode: (mode: SpatialMode) => void
                  setTransitioning: (val: boolean) => void
                  }

                  export const useSpatial = create<SpatialState>((set) => ({
                    mode: "home",
                      transitioning: false,
                        setMode: (mode) => set({ mode }),
                          setTransitioning: (val) => set({ transitioning: val }),
                          }))
                          