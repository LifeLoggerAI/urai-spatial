export type AnchorType =
  | "identity"
  | "work"
  | "health"
  | "relationships"
  | "growth"
  | "legacy"

export interface AnchorNode {
  id: AnchorType
  label: string
  color: string
  position: [number, number, number]
  radius: number
  intensity: number
  order: number
}

export const anchorData: ReadonlyArray<AnchorNode> = [
  {
    id: "identity",
    label: "Identity",
    color: "#88ccff",
    position: [0, 0, 0],
    radius: 1.3,
    intensity: 1.0,
    order: 0,
  },
  {
    id: "work",
    label: "Work",
    color: "#ffaa88",
    position: [4.8, 1.2, -2.4],
    radius: 1.0,
    intensity: 0.9,
    order: 1,
  },
  {
    id: "health",
    label: "Health",
    color: "#88ffaa",
    position: [-4.6, 1.4, -1.8],
    radius: 1.0,
    intensity: 0.92,
    order: 2,
  },
  {
    id: "relationships",
    label: "Relationships",
    color: "#ff88cc",
    position: [3.9, -1.6, 2.8],
    radius: 1.1,
    intensity: 0.96,
    order: 3,
  },
  {
    id: "growth",
    label: "Growth",
    color: "#cc88ff",
    position: [-3.7, -1.2, 3.2],
    radius: 1.05,
    intensity: 0.94,
    order: 4,
  },
  {
    id: "legacy",
    label: "Legacy",
    color: "#ffd966",
    position: [0, 2.8, 4.4],
    radius: 1.15,
    intensity: 0.98,
    order: 5,
  },
] as const