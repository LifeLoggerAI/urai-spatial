export type Tier3Mode = 'home' | 'lifemap' | 'focus' | 'replay'

export type NarratorTone = 'grounded' | 'mythic' | 'consequential' | 'memory'

export type NarratorLine = {
  mode: Tier3Mode
  tone: NarratorTone
  title: string
  subtitle: string
}

export const TIER3_NARRATOR_LINES: Record<Tier3Mode, NarratorLine> = {
  home: {
    mode: 'home',
    tone: 'grounded',
    title: 'You are here.',
    subtitle: 'The field is quiet, but not empty.',
  },
  lifemap: {
    mode: 'lifemap',
    tone: 'mythic',
    title: 'Your life is larger than this moment.',
    subtitle: 'Every point holds a path, a pattern, a threshold.',
  },
  focus: {
    mode: 'focus',
    tone: 'consequential',
    title: 'This point matters.',
    subtitle: 'The world narrows because meaning has chosen a center.',
  },
  replay: {
    mode: 'replay',
    tone: 'memory',
    title: 'You are inside the memory now.',
    subtitle: 'Do not just view it. Stay with it.',
  },
}

export function resolveNarratorLine(mode: string): NarratorLine {
  if (mode === 'replay') return TIER3_NARRATOR_LINES.replay
  if (mode === 'focus') return TIER3_NARRATOR_LINES.focus
  if (mode === 'lifemap') return TIER3_NARRATOR_LINES.lifemap
  return TIER3_NARRATOR_LINES.home
}

export function resolveNarratorOpacity(mode: string, phase: string): number {
  if (phase === 'open_replay') return 1.00
  if (phase === 'close_replay') return 0.14
  if (phase === 'open_focus') return 0.94
  if (phase === 'close_focus') return 0.16
  if (phase === 'open_lifemap') return 0.74
  if (phase === 'close_lifemap') return 0.12
  if (mode === 'replay') return 0.94
  if (mode === 'focus') return 0.86
  if (mode === 'lifemap') return 0.66
  return 0.44
}

export function resolveNarratorTransform(mode: string, phase: string): string {
  if (phase === 'open_replay') return 'translateX(-50%) translateY(-1px) scale(1.01)'
  if (phase === 'open_focus') return 'translateX(-50%) translateY(0px) scale(1.005)'
  if (phase === 'open_lifemap') return 'translateX(-50%) translateY(4px) scale(0.992)'
  if (mode === 'replay') return 'translateX(-50%) translateY(-1px) scale(1.01)'
  if (mode === 'focus') return 'translateX(-50%) translateY(2px) scale(0.996)'
  if (mode === 'lifemap') return 'translateX(-50%) translateY(4px) scale(0.994)'
  return 'translateX(-50%) translateY(6px) scale(0.992)'
}

export function resolveNarratorTitleColor(mode: string): string {
  if (mode === 'replay') return 'rgba(255,245,252,0.96)'
  if (mode === 'focus') return 'rgba(245,248,255,0.95)'
  if (mode === 'lifemap') return 'rgba(238,242,255,0.92)'
  return 'rgba(228,232,240,0.82)'
}

export function resolveNarratorSubtitleColor(mode: string): string {
  if (mode === 'replay') return 'rgba(236,224,244,0.78)'
  if (mode === 'focus') return 'rgba(224,232,248,0.76)'
  if (mode === 'lifemap') return 'rgba(214,224,242,0.70)'
  return 'rgba(190,198,214,0.60)'
}
