export type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

export type CanonState = {
  phase: Phase
  selectedStarId: string | null
  transitionToken: number
  illegalCount: number
  dwellUntil: number
  enteredAt: number
}

export type CanonAction =
  | { type: 'BEGIN_ASCENT' }
  | { type: 'ARRIVE_LIFEMAP' }
  | { type: 'OPEN_FOCUS'; starId: string }
  | { type: 'OPEN_REPLAY' }
  | { type: 'CLOSE_REPLAY' }
  | { type: 'CLOSE_FOCUS' }
  | { type: 'GO_HOME' }
