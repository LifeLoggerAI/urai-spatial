export const URAI_GROUND_CONTRACT_VERSION = 'urai-ground-life-anchors-v1' as const

export type GroundAnchorKind = 'relationship' | 'work' | 'family' | 'health' | 'place' | 'project' | 'routine'

export type GroundLifeAnchor = {
  id: string
  kind: GroundAnchorKind
  title: string
  vitality: number
  position: [number, number, number]
}

export function createGroundAnchor(anchor: GroundLifeAnchor) {
  return {
    ...anchor,
    contract: URAI_GROUND_CONTRACT_VERSION,
    worldRole: 'lived-reality-object',
    interactive: true,
  }
}
