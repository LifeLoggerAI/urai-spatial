import type { UraiDestination } from './worldTypes'

const STORAGE_KEY = 'urai-world-navigation-stack-v1'
const MAX_DEPTH = 16

export type UraiWorldNavigationCheckpoint = {
  destination: UraiDestination
  href: string
  entryPortal?: string
  cameraCheckpoint?: string
  savedAt: number
}

function isCheckpoint(value: unknown): value is UraiWorldNavigationCheckpoint {
  if (!value || typeof value !== 'object') return false
  const checkpoint = value as Partial<UraiWorldNavigationCheckpoint>
  return typeof checkpoint.destination === 'string'
    && typeof checkpoint.href === 'string'
    && typeof checkpoint.savedAt === 'number'
}

export function readWorldNavigationStack(storage: Pick<Storage, 'getItem'>): UraiWorldNavigationCheckpoint[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCheckpoint).slice(-MAX_DEPTH) : []
  } catch {
    return []
  }
}

export function writeWorldNavigationStack(
  storage: Pick<Storage, 'setItem'>,
  stack: readonly UraiWorldNavigationCheckpoint[],
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_DEPTH)))
}

export function pushWorldNavigationCheckpoint(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  checkpoint: UraiWorldNavigationCheckpoint,
) {
  const stack = readWorldNavigationStack(storage)
  const previous = stack.at(-1)
  if (previous?.destination === checkpoint.destination && previous.href === checkpoint.href) return stack
  const next = [...stack, checkpoint].slice(-MAX_DEPTH)
  writeWorldNavigationStack(storage, next)
  return next
}

export function popWorldNavigationCheckpoint(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): UraiWorldNavigationCheckpoint | undefined {
  const stack = readWorldNavigationStack(storage)
  const checkpoint = stack.pop()
  writeWorldNavigationStack(storage, stack)
  return checkpoint
}

export function clearWorldNavigationStack(storage: Pick<Storage, 'setItem'>) {
  writeWorldNavigationStack(storage, [])
}
