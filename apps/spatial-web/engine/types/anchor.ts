
export type AnchorType = 
  | "relationship"
  | "work"
  | "health"
  | "identity"
  | "growth"
  | "legacy"

export type Anchor = {
  id: string
  type: AnchorType
  position: [number, number, number]
}
