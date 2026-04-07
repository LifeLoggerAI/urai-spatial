import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type BackchainStep = {
  fromMode: CanonMode
  toMode: CanonMode
}

export const CANON_BACKCHAIN: BackchainStep[] = [
  { fromMode: 'replay', toMode: 'focus' },
  { fromMode: 'focus', toMode: 'lifemap' },
  { fromMode: 'lifemap', toMode: 'home' },
]

export function getEscTargetMode(mode: CanonMode): CanonMode {
  if (mode === 'replay') return 'focus'
  if (mode === 'focus') return 'lifemap'
  if (mode === 'lifemap') return 'home'
  return 'home'
}

export function isCanonicalEscStep(fromMode: CanonMode, toMode: CanonMode): boolean {
  if (fromMode === 'home' && toMode === 'home') return true
  return CANON_BACKCHAIN.some((x) => x.fromMode === fromMode && x.toMode === toMode)
}
