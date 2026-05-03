import type { Star } from '@/lib/uraiCanon/starTypes'
import type { NarratorPhase } from '@/lib/uraiCanon/types'
import {
  getPhaseNarratorLines,
  normalizeNarratorPhase,
  pickPhaseNarratorLine,
} from '@/spatial/canon/narratorCanon'

export type NarratorPayload = {
  phase: NarratorPhase
  heading: string
  body: string
  tone: string
  eligible: boolean
}

function fallbackHeadingForPhase(phase: NarratorPayload['phase']): string {
  switch (phase) {
    case 'HOME':
      return 'Origin'
    case 'ASCENT':
      return 'Threshold'
    case 'LIFEMAP':
      return 'Life Map'
    case 'FOCUS':
      return 'Focus'
    case 'REPLAY':
      return 'Replay'
    default:
      return 'Presence'
  }
}

function bodyFromStar(star: Star | null | undefined): string {
  if (!star) return ''
  if ((star as any).promptSeed) return String((star as any).promptSeed)
  if ((star as any).description) return String((star as any).description)
  if ((star as any).subtitle) return String((star as any).subtitle)
  return ''
}

export function resolveNarratorPayload(input: {
  phase: string | null | undefined
  star?: Star | null
  phaseIndex?: number
}): NarratorPayload {
  const phase = normalizeNarratorPhase(input.phase) as NarratorPhase
  const baseLine = pickPhaseNarratorLine(phase as any, input.phaseIndex ?? 0)
  const star = input.star ?? null

  const heading =
    (star as any)?.title ??
    (star as any)?.name ??
    fallbackHeadingForPhase(phase)

  const body =
    phase === 'FOCUS' || phase === 'REPLAY'
      ? bodyFromStar(star) || baseLine.text
      : baseLine.text

  const eligible =
    phase === 'FOCUS' || phase === 'REPLAY'
      ? Boolean((star as any)?.narratorEligible ?? true)
      : true

  return {
    phase,
    heading: String(heading),
    body,
    tone: String((star as any)?.narratorTone ?? baseLine.tone),
    eligible,
  }
}

export function getNarratorRotationCount(phase: string | null | undefined): number {
  const normalized = normalizeNarratorPhase(phase) as NarratorPhase
  return getPhaseNarratorLines(normalized as any).length
}
