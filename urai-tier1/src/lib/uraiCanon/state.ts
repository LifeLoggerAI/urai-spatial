import type { CanonAction, CanonState, Phase } from './types'

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

function illegal(prev: CanonState, message: string): CanonState {
  console.error(`[URAI_CANON_ILLEGAL] ${message}`)
  return {
    ...prev,
    illegalCount: prev.illegalCount + 1,
    transitionToken: prev.transitionToken + 1,
  }
}

export function canonReducer(prev: CanonState, action: CanonAction): CanonState {
  
  /* TIER1_HOME_HARD_LOCK */
  if (prev.phase === "HOME") {
    if (
      action.type === "OPEN_FOCUS" ||
      action.type === "OPEN_REPLAY" ||
      action.type === "ARRIVE_LIFEMAP"
    ) {
      console.error("[URAI_CANON_ILLEGAL] blocked from HOME:", action.type);
      return prev;
    }
  }
  
switch (action.type) {
    case 'BEGIN_ASCENT':
      return prev.phase === 'HOME'
        ? enter(prev, 'ASCENT', { selectedStarId: null })
        : illegal(prev, `BEGIN_ASCENT blocked from ${prev.phase}`)

    
case "ARRIVE_LIFEMAP":
  if (prev.phase !== "ASCENT") {
    console.error("[URAI_CANON_ILLEGAL] arriveLifeMap outside ASCENT");
    return prev;
  }

      return prev.phase === 'ASCENT'
        ? enter(prev, 'LIFEMAP')
        : illegal(prev, `ARRIVE_LIFEMAP blocked from ${prev.phase}`)

    
case "OPEN_FOCUS":
  if (prev.phase !== "LIFEMAP") {
    console.error("[URAI_CANON_ILLEGAL] openFocus outside LIFEMAP");
    return prev;
  }

      if (prev.phase !== 'LIFEMAP') return illegal(prev, `OPEN_FOCUS blocked from ${prev.phase}`)
      if (!action.starId) return illegal(prev, 'OPEN_FOCUS blocked without starId')
      return enter(prev, 'FOCUS', { selectedStarId: action.starId })

    
case "OPEN_REPLAY":
  if (prev.phase !== "FOCUS") {
    console.error("[URAI_CANON_ILLEGAL] openReplay outside FOCUS");
    return prev;
  }

      if (prev.phase !== 'FOCUS') return illegal(prev, `OPEN_REPLAY blocked from ${prev.phase}`)
      if (!prev.selectedStarId) return illegal(prev, 'OPEN_REPLAY blocked without selectedStarId')
      return enter(prev, 'REPLAY')

    case 'CLOSE_REPLAY':
      if (prev.phase !== 'REPLAY') return illegal(prev, `CLOSE_REPLAY blocked from ${prev.phase}`)
      if (nowMs() < prev.dwellUntil) return illegal(prev, 'CLOSE_REPLAY blocked during dwell lock')
      return enter(prev, 'FOCUS')

    case 'CLOSE_FOCUS':
      return prev.phase === 'FOCUS'
        ? enter(prev, 'LIFEMAP')
        : illegal(prev, `CLOSE_FOCUS blocked from ${prev.phase}`)

    case 'GO_HOME':
      return prev.phase === 'LIFEMAP'
        ? enter(prev, 'HOME', { selectedStarId: null })
        : illegal(prev, `GO_HOME blocked from ${prev.phase}`)

    default:
      return prev
  }
}
