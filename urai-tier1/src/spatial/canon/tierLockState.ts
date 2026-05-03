export type CanonTierNumber = 1 | 2 | 3 | 4

export type CanonTierLock = {
  tier: CanonTierNumber
  label: string
  status: 'locked' | 'completed locked'
  completed: boolean
  locked: true
}

export const URAI_SPATIAL_TIER_LOCKS = [
  {
    tier: 1,
    label: 'Core',
    status: 'locked',
    completed: true,
    locked: true,
  },
  {
    tier: 2,
    label: 'Camera',
    status: 'completed locked',
    completed: true,
    locked: true,
  },
  {
    tier: 3,
    label: 'Narrator',
    status: 'locked',
    completed: true,
    locked: true,
  },
  {
    tier: 4,
    label: 'Replay',
    status: 'locked',
    completed: true,
    locked: true,
  },
] as const satisfies readonly CanonTierLock[]

export const CANON_TIER_LOCK_LINE =
  'Public demo lock active'

export const CANON_SEQUENCE_LINE =
  'Home -> Ascent -> LifeMap -> Focus -> Replay -> Esc unwind -> Focus -> LifeMap -> Home'

export function getCanonTierLockLine(): string {
  return CANON_TIER_LOCK_LINE
}

export function getCanonSequenceLine(): string {
  return CANON_SEQUENCE_LINE
}
