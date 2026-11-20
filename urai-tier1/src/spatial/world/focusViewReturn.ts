/**
 * Ephemeral, single-use camera hint. Not an authorization capability.
 * Focus must re-read current owner's memory and privacy policy before use.
 * Refresh intentionally discards the hint; no browser storage is used.
 */
export type FocusViewFrame = {
  ownerId: string
  memoryId: string
  manifestId: string
  nodeId: string
  source: 'renderer' | 'fallback'
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  savedAt: number
}
const TTL_MS = 20 * 60_000
const HANDOFF_TTL_MS = 90_000
let pendingFrame: FocusViewFrame | null = null
let pendingHandoff: { ticket: string; frame: FocusViewFrame; preparedAt: number } | null = null
function vector(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100)
}
function valid(frame: Partial<FocusViewFrame>) {
  return typeof frame.ownerId === 'string' && frame.ownerId.length > 0 &&
    typeof frame.memoryId === 'string' && frame.memoryId.length > 0 &&
    typeof frame.manifestId === 'string' && frame.manifestId.length > 0 &&
    typeof frame.nodeId === 'string' && frame.nodeId.length > 0 &&
    (frame.source === 'renderer' || frame.source === 'fallback') &&
    vector(frame.position) && vector(frame.target) &&
    typeof frame.fov === 'number' && Number.isFinite(frame.fov) && frame.fov >= 36 && frame.fov <= 68
}
function matches(frame: FocusViewFrame | null, ownerId: string, memoryId: string, manifestId: string, nodeId?: string): frame is FocusViewFrame {
  const now = Date.now()
  return Boolean(frame && valid(frame) &&
    frame.ownerId === ownerId && frame.memoryId === memoryId &&
    frame.manifestId === manifestId && (!nodeId || frame.nodeId === nodeId) &&
    Number.isFinite(frame.savedAt) && frame.savedAt <= now && now - frame.savedAt <= TTL_MS)
}
export function clearFocusViewReturn() {
  pendingFrame = null
  pendingHandoff = null
}
export function saveFocusViewFrame(frame: Omit<FocusViewFrame, 'savedAt'>): boolean {
  if (typeof window === 'undefined' || !valid(frame)) return false
  clearFocusViewReturn()
  pendingFrame = { ...frame, savedAt: Date.now() }
  return true
}
export function takeFocusViewFrame(ownerId: string, memoryId: string, manifestId: string, nodeId: string): FocusViewFrame | null {
  const frame = pendingFrame
  pendingFrame = null
  return matches(frame, ownerId, memoryId, manifestId, nodeId) ? frame : null
}
export function prepareFocusViewHandoff(ownerId: string, memoryId: string, manifestId: string): { nodeId: string; ticket: string } | null {
  if (typeof window === 'undefined') return null
  const frame = pendingFrame
  pendingFrame = null
  pendingHandoff = null
  if (!matches(frame, ownerId, memoryId, manifestId)) return null
  const ticket = window.crypto?.randomUUID?.()
  if (!ticket || typeof ticket !== 'string' || ticket.length < 16) return null
  pendingHandoff = { ticket, frame, preparedAt: Date.now() }
  return { nodeId: frame.nodeId, ticket }
}
export function consumeFocusViewHandoff(ticket: string, ownerId: string, memoryId: string, manifestId: string, nodeId: string): FocusViewFrame | null {
  if (typeof window === 'undefined' || !ticket || !pendingHandoff) return null
  if (pendingHandoff.ticket !== ticket) return null
  const data = pendingHandoff
  pendingHandoff = null
  const now = Date.now()
  if (data.preparedAt > now || now - data.preparedAt > HANDOFF_TTL_MS) return null
  return matches(data.frame, ownerId, memoryId, manifestId, nodeId) ? data.frame : null
}
