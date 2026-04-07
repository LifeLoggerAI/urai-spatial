export type Phase = 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

export type TransitionState =
  | 'IDLE'
  | 'ASCENT'
  | 'FOCUS_LOCK'
  | 'REPLAY_ENTRY'
  | 'REPLAY_EXIT'

export interface CanonState {
  phase: Phase
  selectedStarId: string | null
  transitionState: TransitionState
  inputLocked: boolean
}

export const initialState: CanonState = {
  phase: 'HOME',
  selectedStarId: null,
  transitionState: 'IDLE',
  inputLocked: false,
}
