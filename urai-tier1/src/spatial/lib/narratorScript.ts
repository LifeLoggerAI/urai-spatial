import type { Star } from '@/lib/uraiCanon/starTypes'
import {
  getPhaseNarratorLines,
  normalizeNarratorPhase,
  pickPhaseNarratorLine,
} from '@/spatial/canon/narratorCanon'

export type NarratorPayload = {
  phase: 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'
  heading: string
  body: string
  tone: string
  eligible: boolean
}

function fallbackHeadingForPhase(phase: NarratorPayload['phase']): string {
  switch (phase) {
    case 'home':
      return 'Origin'
    case 'ascent':
      return 'Threshold'
    case 'lifemap':
      return 'Life Map'
    case 'focus':
      return 'Focus'
    case 'replay':
      return 'Replay'
    default:
      return 'Presence'
  }
}

function bodyFromStar(star: Star | null | undefined): string {
  if (!star) return ''
  if (star.promptSeed) return String(star.promptSeed)
  if (star.description) return String(star.description)
  if (star.subtitle) return String(star.subtitle)
  if (star.chapter) return `Chapter: ${star.chapter}`
  if (star.symbolicClass) return `Symbolic class: ${star.symbolicClass}`
  return ''
}

export function resolveNarratorPayload(input: {
  phase: string | null | undefined
  star?: Star | null
  phaseIndex?: number
}): NarratorPayload {
  const phase = normalizeNarratorPhase(input.phase)
  const baseLine = pickPhaseNarratorLine(phase, input.phaseIndex ?? 0)
  const star = input.star ?? null

  const heading =
    star?.title ??
    star?.name ??
    fallbackHeadingForPhase(phase)

  const body =
    phase === 'focus' || phase === 'replay'
      ? bodyFromStar(star) || baseLine.text
      : baseLine.text

  const eligible =
    phase === 'focus' || phase === 'replay'
      ? Boolean(star?.narratorEligible ?? true)
      : true

  return {
    phase,
    heading: String(heading),
    body,
    tone: String(star?.narratorTone ?? baseLine.tone),
    eligible,
  }
}

export function getNarratorRotationCount(phase: string | null | undefined): number {
  const normalized = normalizeNarratorPhase(phase)
  return getPhaseNarratorLines(normalized).length
}
