import type { CanonAction, CanonState, Mode, Phase } from './types'

const REPLAY_DWELL_MS = 900

const nowMs = () =>
typeof performance !== 'undefined' ? performance.now() : Date.now()

export const initialCanonState: CanonState = {
phase: 'HOME',
selectedStarId: null,
transitionToken: 0,
illegalCount: 0,
dwellUntil: 0,
enteredAt: nowMs(),
}

function enter(prev: CanonState, phase: Phase, extra: Partial<CanonState> = {}): CanonState {
const t = nowMs()
return {
...prev,
...extra,
phase,
enteredAt: t,
transitionToken: prev.transitionToken + 1,
dwellUntil: phase === 'REPLAY' ? t + REPLAY_DWELL_MS : extra.dwellUntil ?? 0,
}
}

function blockTransition(prev: CanonState, message: string): CanonState {
return {
...prev,
illegalCount: prev.illegalCount + 1,
transitionToken: prev.transitionToken + 1,
}
}

export function normalizeToPhase(value: unknown): Phase {
const text = String(value || 'HOME').toUpperCase()

if (text.includes('LIFE')) return 'LIFEMAP'
if (text.includes('ASCENT')) return 'ASCENT'
if (text.includes('FOCUS')) return 'FOCUS'
if (text.includes('REPLAY')) return 'REPLAY'
if (text.includes('HOME')) return 'HOME'

return 'HOME'
}

export function normalizeToMode(value: unknown): Mode {
return normalizeToPhase(value)
}

export function modeToPhase(value: unknown): Phase {
return normalizeToPhase(value)
}

export function phaseToMode(value: unknown): Mode {
return normalizeToMode(value)
}

export function resolveEscTarget(value: unknown): Phase {
const phase = normalizeToPhase(value)

if (phase === 'REPLAY') return 'FOCUS'
if (phase === 'FOCUS') return 'LIFEMAP'
if (phase === 'LIFEMAP') return 'HOME'
if (phase === 'ASCENT') return 'HOME'

return 'HOME'
}

export function assertLegalTransition(from: unknown, to: unknown): boolean {
const fromPhase = normalizeToPhase(from)
const toPhase = normalizeToPhase(to)

if (fromPhase === toPhase) return true
if (fromPhase === 'HOME' && toPhase === 'ASCENT') return true
if (fromPhase === 'ASCENT' && toPhase === 'LIFEMAP') return true
if (fromPhase === 'LIFEMAP' && toPhase === 'FOCUS') return true
if (fromPhase === 'FOCUS' && toPhase === 'REPLAY') return true
if (fromPhase === 'REPLAY' && toPhase === 'FOCUS') return true
if (fromPhase === 'FOCUS' && toPhase === 'LIFEMAP') return true
if (fromPhase === 'LIFEMAP' && toPhase === 'HOME') return true

console.error('[URAI_CANON_ILLEGAL] transition blocked:', fromPhase, '->', toPhase)
return false
}

export function canonReducer(prev: CanonState, action: CanonAction): CanonState {
if (prev.phase === 'HOME') {
if (
action.type === 'OPEN_FOCUS' ||
action.type === 'OPEN_REPLAY' ||
action.type === 'ARRIVE_LIFEMAP'
) {
console.error('[URAI_CANON_ILLEGAL] blocked from HOME:', action.type)
return prev
}
}

switch (action.type) {
case 'BEGIN_ASCENT': {
if (prev.phase === 'HOME') {
return enter(prev, 'ASCENT', { selectedStarId: null })
}
}

case 'ARRIVE_LIFEMAP': {
  if (prev.phase !== 'ASCENT') {
    return blockTransition(prev, 'ARRIVE_LIFEMAP blocked outside ASCENT')
  }
  return enter(prev, 'LIFEMAP')
}

case 'OPEN_FOCUS': {
  if (prev.phase !== 'LIFEMAP') {
    return blockTransition(prev, 'OPEN_FOCUS blocked outside LIFEMAP')
  }
  if (!action.starId) {
    return blockTransition(prev, 'OPEN_FOCUS blocked without starId')
  }
  return enter(prev, 'FOCUS', { selectedStarId: action.starId })
}

case 'OPEN_REPLAY': {
  if (prev.phase !== 'FOCUS') {
    return blockTransition(prev, 'OPEN_REPLAY blocked outside FOCUS')
  }
  if (!prev.selectedStarId) {
    return blockTransition(prev, 'OPEN_REPLAY blocked without selectedStarId')
  }
  return enter(prev, 'REPLAY')
}

case 'CLOSE_REPLAY': {
  if (prev.phase !== 'REPLAY') {
  }
  if (nowMs() < prev.dwellUntil) {
    return blockTransition(prev, 'CLOSE_REPLAY blocked during dwell lock')
  }
  return enter(prev, 'FOCUS')
}

case 'CLOSE_FOCUS': {
  if (prev.phase === 'FOCUS') {
    return enter(prev, 'LIFEMAP')
  }
}

case 'GO_HOME': {
  if (prev.phase === 'LIFEMAP') {
    return enter(prev, 'HOME', { selectedStarId: null })
  }
}

default:
  return prev

}
}
