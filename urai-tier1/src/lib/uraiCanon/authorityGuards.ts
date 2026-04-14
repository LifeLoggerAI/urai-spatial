import {
  Phase,
  UraiPhase,
  phaseToMode,
  modeToPhase,
  assertLegalTransition,
} from './state'

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUpperPhase(value: unknown): value is UraiPhase {
  return value === 'HOME' ||
    value === 'ASCENT' ||
    value === 'LIFEMAP' ||
    value === 'FOCUS' ||
    value === 'REPLAY'
}

function isLowerPhase(value: unknown): value is Phase {
  return value === 'home' ||
    value === 'ascent' ||
    value === 'lifemap' ||
    value === 'focus' ||
    value === 'replay'
}

// Always return UraiPhase (UPPERCASE)
export function normalizeToUraiPhase(input: unknown): UraiPhase {
  if (isUpperPhase(input)) return input
  if (isLowerPhase(input)) return phaseToMode(input)
  if (isString(input)) {
    const lowered = input.toLowerCase()
    if (isLowerPhase(lowered)) return phaseToMode(lowered)
    const uppered = input.toUpperCase()
    if (isUpperPhase(uppered)) return uppered
  }
  return 'HOME'
}

// Always return Phase (lowercase)
export function normalizeToPhase(input: unknown): Phase {
  if (isLowerPhase(input)) return input
  if (isUpperPhase(input)) return modeToPhase(input)
  if (isString(input)) {
    const lowered = input.toLowerCase()
    if (isLowerPhase(lowered)) return lowered
    const uppered = input.toUpperCase()
    if (isUpperPhase(uppered)) return modeToPhase(uppered)
  }
  return 'home'
}

// Safe transition guard (canonical)
export function guardTransition(
  from: unknown,
  to: unknown
): UraiPhase {
  const fromPhase = normalizeToPhase(from)
  const toPhase = normalizeToPhase(to)

  assertLegalTransition(fromPhase, toPhase)

  return normalizeToUraiPhase(toPhase)
}

// ---- RESTORED API SURFACE (COMPAT LAYER) ----

export const LEGAL_PHASE_TRANSITIONS = {
  HOME: ['ASCENT'],
  ASCENT: ['LIFEMAP'],
  LIFEMAP: ['FOCUS'],
  FOCUS: ['REPLAY'],
  REPLAY: ['FOCUS'],
}

export const normalizeAuthorityPhase = normalizeToUraiPhase

export function assertAuthorityTransition(from: unknown, to: unknown) {
  return guardTransition(from, to)
}

export function isFocusOrReplay(p: unknown) {
  const u = normalizeToUraiPhase(p)
  return u === 'FOCUS' || u === 'REPLAY'
}

export function isReplayPhase(p: unknown) {
  return normalizeToUraiPhase(p) === 'REPLAY'
}

export function isHomeLike(p: unknown) {
  const u = normalizeToUraiPhase(p)
  return u === 'HOME' || u === 'ASCENT'
}

export function resolveStableMode(p: unknown) {
  return normalizeToUraiPhase(p)
}
