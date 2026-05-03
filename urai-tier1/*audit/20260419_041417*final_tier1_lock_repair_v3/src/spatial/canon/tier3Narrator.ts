export type Tier3Mode = 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

export type NarratorTone = 'grounded' | 'mythic' | 'consequential' | 'memory'

export type NarratorLine = {
  mode: Tier3Mode
  tone: NarratorTone
  title: string
  subtitle: string
}

export const TIER3_NARRATOR_LINES: Record<Tier3Mode, NarratorLine> = {
  HOME: {
    mode: 'HOME',
    tone: 'grounded',
    title: 'You are here.',
    subtitle: 'The field is quiet, but not empty.',
  },
  LIFEMAP: {
    mode: 'LIFEMAP',
    tone: 'mythic',
    title: 'Your life is larger than this moment.',
    subtitle: 'Every point holds a path, a pattern, a threshold.',
  },
  FOCUS: {
    mode: 'FOCUS',
    tone: 'consequential',
    title: 'This point matters.',
    subtitle: 'The world narrows because meaning has chosen a center.',
  },
  REPLAY: {
    mode: 'REPLAY',
    tone: 'memory',
    title: 'You are inside the memory now.',
    subtitle: 'Do not just view it. Stay with it.',
  },
}

export function resolveNarratorLine(mode: string): NarratorLine {
  if (mode === 'REPLAY') return TIER3_NARRATOR_LINES.REPLAY
  if (mode === 'FOCUS') return TIER3_NARRATOR_LINES.FOCUS
  if (mode === 'LIFEMAP') return TIER3_NARRATOR_LINES.LIFEMAP
  return TIER3_NARRATOR_LINES.HOME
}

export function resolveNarratorOpacity(mode: string, phase: string): number {
  if (phase === 'open_replay') return 1.00
  if (phase === 'close_replay') return 0.14
  if (phase === 'FOCUS') return 0.94
  if (phase === 'close_focus') return 0.16
  if (phase === 'open_lifemap') return 0.74
  if (phase === 'close_lifemap') return 0.12
  if (mode === 'REPLAY') return 0.94
  if (mode === 'FOCUS') return 0.86
  if (mode === 'LIFEMAP') return 0.66
  return 0.44
}

export function resolveNarratorTransform(mode: string, phase: string): string {
  if (phase === 'open_replay') return 'translateX(-50%) translateY(-1px) scale(1.01)'
  if (phase === 'FOCUS') return 'translateX(-50%) translateY(0px) scale(1.005)'
  if (phase === 'open_lifemap') return 'translateX(-50%) translateY(4px) scale(0.992)'
  if (mode === 'REPLAY') return 'translateX(-50%) translateY(-1px) scale(1.01)'
  if (mode === 'FOCUS') return 'translateX(-50%) translateY(2px) scale(0.996)'
  if (mode === 'LIFEMAP') return 'translateX(-50%) translateY(4px) scale(0.994)'
  return 'translateX(-50%) translateY(6px) scale(0.992)'
}

export function resolveNarratorTitleColor(mode: string): string {
  if (mode === 'REPLAY') return 'rgba(255,245,252,0.96)'
  if (mode === 'FOCUS') return 'rgba(245,248,255,0.95)'
  if (mode === 'LIFEMAP') return 'rgba(238,242,255,0.92)'
  return 'rgba(228,232,240,0.82)'
}

export function resolveNarratorSubtitleColor(mode: string): string {
  if (mode === 'REPLAY') return 'rgba(236,224,244,0.78)'
  if (mode === 'FOCUS') return 'rgba(224,232,248,0.76)'
  if (mode === 'LIFEMAP') return 'rgba(214,224,242,0.70)'
  return 'rgba(190,198,214,0.60)'
}
