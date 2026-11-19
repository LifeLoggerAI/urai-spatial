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
const HANDOFF_KEY = 'urai:focus-return-handoff:v3'
const HANDOFF_TTL_MS = 90_000

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
    window.sessionStorage.removeItem(HANDOFF_KEY)
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

// View-only ticket. A copied Focus URL cannot consume a different pending view.
export function prepareFocusViewHandoff(memoryId: string, manifestId: string): {nodeId: string; ticket: string} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
    if (!raw) return null
    const frame: Partial<FocusViewFrame> = JSON.parse(raw)
    const now = Date.now()
    if (!frame || !valid(frame) || frame.memoryId !== memoryId || frame.manifestId !== manifestId ||
        typeof frame.savedAt !== 'number' || !Number.isFinite(frame.savedAt) ||
        frame.savedAt > now || now - frame.savedAt > TTL_MS) return null
    const ticket = window.crypto?.randomUUID?.()
    if (!ticket || typeof ticket !== 'string' || ticket.length < 16) return null
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ticket, frame, preparedAt: now}))
    return {nodeId: frame.nodeId!, ticket}
  } catch { return null }
}

export function consumeFocusViewHandoff(ticket: string, memoryId: string, manifestId: string, nodeId: string): FocusViewFrame | null {
  if (typeof window === 'undefined' || !ticket) return null
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    const data: {ticket?: unknown; preparedAt?: unknown; frame?: unknown} = JSON.parse(raw)
    if (!data || typeof data !== 'object') {
      window.sessionStorage.removeItem(HANDOFF_KEY)
      return null
    }
    // A forged or stale ticket must not consume someone else's valid pending view.
    if (data.ticket !== ticket) return null
    window.sessionStorage.removeItem(HANDOFF_KEY)
    const now = Date.now()
    if (typeof data.preparedAt !== 'number' || !Number.isFinite(data.preparedAt) ||
        data.preparedAt > now || now - data.preparedAt > HANDOFF_TTL_MS ||
        !data.frame || typeof data.frame !== 'object') return null
    const frame = data.frame as Partial<FocusViewFrame>
    if (!valid(frame) || frame.memoryId !== memoryId || frame.manifestId !== manifestId ||
        frame.nodeId !== nodeId || typeof frame.savedAt !== 'number' ||
        !Number.isFinite(frame.savedAt) || frame.savedAt > now || now - frame.savedAt > TTL_MS) return null
    return frame as FocusViewFrame
  } catch { return null }
}
