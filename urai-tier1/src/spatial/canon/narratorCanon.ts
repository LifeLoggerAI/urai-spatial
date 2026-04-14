export type NarratorPhase =
  | 'home'
  | 'ascent'
  | 'lifemap'
  | 'focus'
  | 'replay'

export type NarratorTone =
  | 'quiet'
  | 'clear'
  | 'reverent'
  | 'uncanny'
  | 'intimate'
  | 'distant'

export type NarratorLine = {
  id: string
  phase: NarratorPhase
  tone: NarratorTone
  text: string
  priority: number
}

export const PHASE_NARRATOR_LINES: Record<NarratorPhase, NarratorLine[]> = {
  home: [
    { id: 'home_01', phase: 'home', tone: 'quiet', text: 'Everything begins in stillness.', priority: 100 },
    { id: 'home_02', phase: 'home', tone: 'quiet', text: 'The field is quiet, but not empty.', priority: 90 },
  ],
  ascent: [
    { id: 'ascent_01', phase: 'ascent', tone: 'reverent', text: 'Crossing the threshold.', priority: 100 },
    { id: 'ascent_02', phase: 'ascent', tone: 'reverent', text: 'The system opens as you commit to motion.', priority: 90 },
  ],
  lifemap: [
    { id: 'lifemap_01', phase: 'lifemap', tone: 'distant', text: 'The map reveals what was always there.', priority: 100 },
    { id: 'lifemap_02', phase: 'lifemap', tone: 'distant', text: 'Meaning is distributed across the field.', priority: 90 },
  ],
  focus: [
    { id: 'focus_01', phase: 'focus', tone: 'intimate', text: 'One signal separates from the whole.', priority: 100 },
    { id: 'focus_02', phase: 'focus', tone: 'clear', text: 'Selection becomes presence.', priority: 90 },
  ],
  replay: [
    { id: 'replay_01', phase: 'replay', tone: 'clear', text: 'This is not observation. This is return.', priority: 100 },
    { id: 'replay_02', phase: 'replay', tone: 'intimate', text: 'Memory carries weight when you enter it fully.', priority: 90 },
  ],
}

export function normalizeNarratorPhase(value: string | null | undefined): NarratorPhase {
  switch (value) {
    case 'home':
    case 'ascent':
    case 'lifemap':
    case 'focus':
    case 'replay':
      return value
    default:
      return 'home'
  }
}

export function getPhaseNarratorLines(phase: NarratorPhase): NarratorLine[] {
  return PHASE_NARRATOR_LINES[phase] ?? PHASE_NARRATOR_LINES.home
}

export function pickPhaseNarratorLine(
  phase: NarratorPhase,
  index = 0
): NarratorLine {
  const lines = getPhaseNarratorLines(phase).slice().sort((a, b) => b.priority - a.priority)
  if (!lines.length) {
    return { id: 'fallback', phase, tone: 'quiet', text: '', priority: 0 }
  }
  return lines[Math.abs(index) % lines.length]
}

export function getToneClassName(tone: NarratorTone): string {
  switch (tone) {
    case 'quiet':
      return 'tracking-[0.18em] uppercase opacity-80'
    case 'clear':
      return 'tracking-[0.14em] uppercase opacity-95'
    case 'reverent':
      return 'tracking-[0.22em] uppercase opacity-90'
    case 'uncanny':
      return 'tracking-[0.24em] uppercase opacity-85'
    case 'intimate':
      return 'tracking-[0.08em] opacity-95'
    case 'distant':
      return 'tracking-[0.18em] uppercase opacity-75'
    default:
      return 'tracking-[0.14em] uppercase opacity-90'
  }
}
