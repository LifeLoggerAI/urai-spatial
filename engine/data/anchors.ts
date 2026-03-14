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
}

export const anchorData: ReadonlyArray<AnchorNode> = [
  { id: "identity", label: "Identity", color: "#88ccff" },
  { id: "work", label: "Work", color: "#ffaa88" },
  { id: "health", label: "Health", color: "#88ffaa" },
  { id: "relationships", label: "Relationships", color: "#ff88cc" },
  { id: "growth", label: "Growth", color: "#cc88ff" },
  { id: "legacy", label: "Legacy", color: "#ffd966" }
] as const