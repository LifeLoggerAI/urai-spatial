// The Home transition checkpoint is best-effort camera continuity.
// Storage failures must never suppress canonical travel or grant authority.
export const HOME_WORLD_CHECKPOINT_STORAGE_KEY = 'urai-world-home-checkpoint'

export type HomeWorldCheckpoint = {
  destination: 'home'
  entryPortal: string
  cameraCheckpoint: string
  savedAt: number
}

export function persistHomeWorldCheckpoint(
  checkpoint: HomeWorldCheckpoint,
  storage: () => Pick<Storage, 'setItem'> = () => window.sessionStorage,
): boolean {
  try {
    storage().setItem(HOME_WORLD_CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint))
    return true
  } catch {
    // Safari/embedded browsers can block even reading sessionStorage.
    // An optional pose receipt must not break the journey.
    return false
  }
}
