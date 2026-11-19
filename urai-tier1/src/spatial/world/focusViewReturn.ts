export type FocusViewFrame = {
  memoryId: string
  manifestId: string
  nodeId: string
  source: 'renderer' | 'fallback'
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  savedAt: number
}
const STORAGE_KEY = 'urai:focus-return-camera:v2'
const TTL_MS = 20 * 60_000

function vector(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100)
}
function valid(frame: Partial<FocusViewFrame>) {
  return typeof frame.memoryId === 'string' && frame.memoryId.length > 0 &&
    typeof frame.manifestId === 'string' && frame.manifestId.length > 0 &&
    typeof frame.nodeId === 'string' && frame.nodeId.length > 0 &&
    (frame.source === 'renderer' || frame.source === 'fallback') &&
    vector(frame.position) && vector(frame.target) &&
    typeof frame.fov === 'number' && Number.isFinite(frame.fov) && frame.fov >= 36 && frame.fov <= 68
}
export function saveFocusViewFrame(frame: Omit<FocusViewFrame, 'savedAt'>): boolean {
  if (typeof window === 'undefined' || !valid(frame)) return false
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({...frame, savedAt: Date.now()}))
    return true
  } catch { return false }
}
export function takeFocusViewFrame(
  memoryId: string,
  manifestId: string,
  nodeId: string,
): FocusViewFrame | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
    if (!raw) return null
    const value: Partial<FocusViewFrame> = JSON.parse(raw)
    const now = Date.now()
    if (!value || !valid(value) || value.memoryId !== memoryId || value.manifestId !== manifestId || value.nodeId !== nodeId ||
        typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt) ||
        value.savedAt > now || now - value.savedAt > TTL_MS) return null
    return value as FocusViewFrame
  } catch { return null }
}
