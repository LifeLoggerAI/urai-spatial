'use client'

// Navigation-only focus handoff. No memory IDs, media data or credentials.
const KEY = 'urai:replay:return-focus:v1'
export function noteReplayReturnFocus() {
  try { window.sessionStorage.setItem(KEY, String(Date.now())) } catch { /* optional */ }
}
export function consumeReplayReturnFocus() {
  try {
    const value = window.sessionStorage.getItem(KEY)
    if (!value) return false
    window.sessionStorage.removeItem(KEY)
    const elapsed = Date.now() - Number(value)
    return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 30_000
  } catch { return false }
}
