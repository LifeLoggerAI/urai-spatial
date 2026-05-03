import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type BackchainStep = {
  fromMode: CanonMode
  toMode: CanonMode
}

export const CANON_BACKCHAIN: BackchainStep[] = [
  { fromMode: 'REPLAY', toMode: 'FOCUS' },
  { fromMode: 'FOCUS', toMode: 'LIFEMAP' },
  { fromMode: 'LIFEMAP', toMode: 'HOME' },
]

export function getEscTargetMode(mode: CanonMode): CanonMode {
  if (mode === 'REPLAY') return 'FOCUS'
  if (mode === 'FOCUS') return 'LIFEMAP'
  if (mode === 'LIFEMAP') return 'HOME'
  return 'HOME'
}

export function isCanonicalEscStep(fromMode: CanonMode, toMode: CanonMode): boolean {
  if (fromMode === 'HOME' && toMode === 'HOME') return true
  return CANON_BACKCHAIN.some((x) => x.fromMode === fromMode && x.toMode === toMode)
}
