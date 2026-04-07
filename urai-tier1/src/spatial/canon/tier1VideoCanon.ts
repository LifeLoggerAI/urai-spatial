export type Tier1Mode = 'home' | 'lifemap' | 'focus' | 'replay'
export type Tier1Phase =
  | 'idle'
  | 'ascent'
  | 'arrive_lifemap'
  | 'open_focus'
  | 'close_focus'
  | 'open_replay'
  | 'close_replay'
  | 'go_home'

export function replayVeilOpacity(mode: Tier1Mode, phase: Tier1Phase): number {
  if (mode === 'replay') return 0.22
  if (phase === 'open_replay') return 0.16
  if (phase === 'close_replay') return 0.10
  return 0
}
