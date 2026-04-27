export type MemoryNode = {
  id: string
  lines: string[]
  intensity: number
}

export const MEMORY_MAP: Record<string, MemoryNode> = {
  "star-1": {
    id: "star-1",
    lines: ["you paused before replying"],
    intensity: 0.7,
  },
  "star-2": {
    id: "star-2",
    lines: ["that moment stayed longer than expected"],
    intensity: 0.6,
  },
  "star-3": {
    id: "star-3",
    lines: ["you almost said something different"],
    intensity: 0.8,
  },
  "star-4": {
    id: "star-4",
    lines: ["it didn’t seem important at the time"],
    intensity: 0.5,
  },
  "star-5": {
    id: "star-5",
    lines: ["but it left a trace"],
    intensity: 0.65,
  }
}
