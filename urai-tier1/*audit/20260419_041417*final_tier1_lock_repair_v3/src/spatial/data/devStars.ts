export type DevStar = {
  id: string
  title: string
  position: [number, number, number]
  color?: string
  size?: number
  year?: string
  summary?: string
}

export const DEV_STARS: DevStar[] = [
  {
    id: "origin",
    title: "Origin",
    position: [0, 0, -8],
    color: "#9ec5ff",
    size: 1.2,
    year: "Start",
    summary: "System origin point",
  },
  {
    id: "threshold",
    title: "Threshold",
    position: [-5, 2, -14],
    color: "#c8b6ff",
    size: 1.35,
    year: "Threshold",
    summary: "Entry into the deeper field",
  },
  {
    id: "memory-bloom",
    title: "Memory Bloom",
    position: [4, -1, -16],
    color: "#ffb7d5",
    size: 1.25,
    year: "Bloom",
    summary: "Emotional memory cluster",
  },
  {
    id: "focus-node",
    title: "Focus Node",
    position: [8, 3, -20],
    color: "#ffd580",
    size: 1.4,
    year: "Focus",
    summary: "Primary focus anchor",
  },
  {
    id: "echo",
    title: "Echo",
    position: [-9, -4, -22],
    color: "#89f0c2",
    size: 1.15,
    year: "Echo",
    summary: "Relationship resonance point",
  },
  {
    id: "replay-gate",
    title: "Replay Gate",
    position: [2, 6, -26],
    color: "#caa8ff",
    size: 1.5,
    year: "Replay",
    summary: "Immersive replay threshold",
  },
  {
    id: "far-signal",
    title: "Far Signal",
    position: [-3, 5, -32],
    color: "#8fb8ff",
    size: 1.1,
    year: "Signal",
    summary: "Deep field continuity anchor",
  },
]
