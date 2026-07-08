export type URAIWorldMode =
  | 'homeBooting'
  | 'homeIdle'
  | 'enteringGround'
  | 'groundActive'
  | 'enteringLifeMap'
  | 'lifeMapActive'
  | 'starSelected'
  | 'enteringFocus'
  | 'focusActive'
  | 'enteringReplay'
  | 'replayActive'
  | 'passportActive'
  | 'statusActive'
  | 'returningHome'

export type SelectedMemoryState = {
  memoryId: string | null
  sourceStarId: string | null
  sourceStarPosition: [number, number, number] | null
  transitionProgress: number
}

export const defaultSelectedMemoryState: SelectedMemoryState = {
  memoryId: null,
  sourceStarId: null,
  sourceStarPosition: null,
  transitionProgress: 0,
}
