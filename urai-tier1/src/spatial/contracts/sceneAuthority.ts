
export type CanonMode = 'home' | 'lifemap' | 'focus' | 'replay'

export type SceneAuthorityState = {
  mode: CanonMode
  selectedStarId: string | null
  selectedMemoryRef: string | null
  hoveredStarId: string | null
  orbPanelOpen: boolean
  groundViewOpen: boolean
}

export const initialSceneAuthorityState: SceneAuthorityState = {
  mode: 'home',
  selectedStarId: null,
  selectedMemoryRef: null,
  hoveredStarId: null,
  orbPanelOpen: false,
  groundViewOpen: false,
}
