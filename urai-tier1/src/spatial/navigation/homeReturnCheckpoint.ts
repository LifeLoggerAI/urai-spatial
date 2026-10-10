// Same-tab camera continuity only. This checkpoint contains no memory, account,
// consent, or provider identity and grants no destination/data authority.
export type HomeReturnCheckpoint = {
  version: 1
  id: string
  savedAt: number
  kind: 'ascent' | 'ground'
  position: [number, number, number]
  groundPosition: [number, number, number]
  firstControl: [number, number, number]
  secondControl: [number, number, number]
  endPosition: [number, number, number]
  startYaw: number
  startPitch: number
  endYaw: number
  endPitch: number
  fov: number
  duration: number
}
const KEY = 'urai-home-camera-return-v1'
const MAX_AGE = 24 * 60 * 60 * 1000
let retained: HomeReturnCheckpoint | null = null
let serial = 0
function storage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.sessionStorage } catch { return undefined }
}
function vector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 200)
}
export function parseHomeReturnCheckpoint(value: unknown, now = Date.now()): HomeReturnCheckpoint | null {
  if (!value || typeof value !== 'object') return null
  const c = value as HomeReturnCheckpoint
  if (c.version !== 1 || typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.id) || (c.kind !== 'ascent' && c.kind !== 'ground')) return null
  if (!Number.isFinite(c.savedAt) || c.savedAt > now + 1000 || now - c.savedAt > MAX_AGE) return null
  if (![c.position, c.groundPosition, c.firstControl, c.secondControl, c.endPosition].every(vector)) return null
  if (Math.abs(c.groundPosition[0]) > 14 || c.groundPosition[2] < -18 || c.groundPosition[2] > 12) return null
  const eyeHeight = c.position[1] - c.groundPosition[1]
  if (eyeHeight < 1.2 || eyeHeight > 2.2) return null
  if (![c.startYaw, c.endYaw, c.startPitch, c.endPitch, c.fov, c.duration].every(Number.isFinite)) return null
  if (Math.abs(c.startPitch) > Math.PI / 2 || Math.abs(c.endPitch) > Math.PI / 2) return null
  if (c.fov < 25 || c.fov > 90 || c.duration < .2 || c.duration > 6) return null
  // Copy on admission: a flight cannot change beneath another owner.
  return { ...c, startYaw: Math.atan2(Math.sin(c.startYaw), Math.cos(c.startYaw)), endYaw: Math.atan2(Math.sin(c.endYaw), Math.cos(c.endYaw)), position: [...c.position], groundPosition: [...c.groundPosition], firstControl: [...c.firstControl], secondControl: [...c.secondControl], endPosition: [...c.endPosition] }
}
export function saveHomeReturnCheckpoint(pose: Omit<HomeReturnCheckpoint, 'version' | 'id' | 'savedAt'>): HomeReturnCheckpoint | null {
  const now = Date.now()
  const c = parseHomeReturnCheckpoint({ ...pose, version: 1, id: `${now.toString(36)}-${++serial}`, savedAt: now }, now)
  if (!c) return null
  retained = parseHomeReturnCheckpoint(c, now)
  try { storage()?.setItem(KEY, JSON.stringify(c)) } catch { /* same-tab in-memory continuity remains available */ }
  return c
}
export function peekHomeReturnCheckpoint(): HomeReturnCheckpoint | null {
  const memory = parseHomeReturnCheckpoint(retained)
  if (memory) return memory
  try {
    const raw = storage()?.getItem(KEY)
    return raw ? parseHomeReturnCheckpoint(JSON.parse(raw)) : null
  } catch { return null }
}
export function clearHomeReturnCheckpoint(id: string) {
  if (peekHomeReturnCheckpoint()?.id !== id) return
  retained = null
  try { storage()?.removeItem(KEY) } catch { /* blocked optional storage does not prevent travel */ }
}
export function requestedHomeReturnCheckpoint(params: URLSearchParams): HomeReturnCheckpoint | null {
  const ids = params.getAll('homeReturn')
  if (ids.length !== 1) return null
  const c = peekHomeReturnCheckpoint()
  return c && c.id === ids[0] ? c : null
}
export function homeReturnHref(search: string): string {
  const next = new URLSearchParams()
  const demo = new URLSearchParams(search).getAll('demo')
  if (demo.length === 1 && demo[0] === '1') next.set('demo', '1')
  const c = peekHomeReturnCheckpoint()
  // A direct Life Map deep link has no prior Home pose to restore. It still
  // uses the canonical descent, with Home's collision-safe default destination.
  next.set('homeReturn', c?.id ?? 'descent')
  return `/home?${next.toString()}`
}
