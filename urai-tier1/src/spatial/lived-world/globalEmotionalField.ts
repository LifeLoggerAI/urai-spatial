import type { ConsentDecisionSnapshot } from './livedWorldGraph'

export const GLOBAL_EMOTIONAL_FIELD_PURPOSE = 'data.public-good.emotional-field' as const
export const GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT = 100

export type GlobalEmotionalSignal = 'calm' | 'pressure' | 'reflection' | 'connection' | 'grief' | 'hope' | 'energy' | 'recovery' | 'turbulence' | 'clearing'
export type GlobalFieldPrecision = 'country' | 'multi-region' | 'coarse-region'
export type GlobalFieldState = 'unavailable' | 'suppressed' | 'aggregate'
export type GlobalEmotionalFieldCell = { id: string; regionKey: string; precision: GlobalFieldPrecision; timeBucket: string; cohortSize: number; requiredMinimumCohort: number; sensitiveThresholdApproved: boolean; locationSensitive: boolean; sensitiveInferenceDerived: boolean; signal: Partial<Record<GlobalEmotionalSignal, number>>; confidence: number; policyVersion: string; riskAssessmentId: string }
export type GlobalEmotionalFieldDecision = { state: GlobalFieldState; reason: string; cell: GlobalEmotionalFieldCell | null }
export type GlobalEmotionalFieldConsent = ConsentDecisionSnapshot & { purpose: typeof GLOBAL_EMOTIONAL_FIELD_PURPOSE; tier: 'C8' }
const boundedSignal = (signal: GlobalEmotionalFieldCell['signal']) => Object.values(signal).every((value) => value === undefined || (Number.isFinite(value) && value >= 0 && value <= 1))

/** Viewer evaluation is deliberately independent of contribution consent. */
export function evaluatePublishedGlobalEmotionalFieldCell(cell: GlobalEmotionalFieldCell | null | undefined): GlobalEmotionalFieldDecision {
  if (!cell) return { state: 'unavailable', reason: 'NO_AGGREGATE_CELL', cell: null }
  if (!cell.policyVersion || !cell.riskAssessmentId) return { state: 'suppressed', reason: 'MISSING_POLICY_OR_RISK_RECEIPT', cell: null }
  if (!Number.isFinite(cell.cohortSize) || !Number.isFinite(cell.requiredMinimumCohort)) return { state: 'suppressed', reason: 'INVALID_COHORT', cell: null }
  if (cell.requiredMinimumCohort < GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT) return { state: 'suppressed', reason: 'BELOW_PRIVACY_STANDARD_FLOOR', cell: null }
  if (cell.cohortSize < cell.requiredMinimumCohort) return { state: 'suppressed', reason: 'INSUFFICIENT_COHORT', cell: null }
  if ((cell.locationSensitive || cell.sensitiveInferenceDerived) && (!cell.sensitiveThresholdApproved || cell.requiredMinimumCohort <= GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT)) return { state: 'suppressed', reason: 'HIGHER_SENSITIVE_COHORT_THRESHOLD_REQUIRED', cell: null }
  if (!boundedSignal(cell.signal)) return { state: 'suppressed', reason: 'INVALID_SIGNAL_VECTOR', cell: null }
  if (!Number.isFinite(cell.confidence) || cell.confidence < 0 || cell.confidence > 1) return { state: 'suppressed', reason: 'INVALID_CONFIDENCE', cell: null }
  if (!['country', 'multi-region', 'coarse-region'].includes(cell.precision)) return { state: 'suppressed', reason: 'PRECISION_TOO_FINE', cell: null }
  return { state: 'aggregate', reason: 'SAFE_AGGREGATE_AVAILABLE', cell }
}

/** Contributor-side evaluation keeps C8 participation separate from public viewing. */
export function evaluateGlobalEmotionalFieldCell(args: { cell: GlobalEmotionalFieldCell | null | undefined; consent: GlobalEmotionalFieldConsent | null | undefined }): GlobalEmotionalFieldDecision {
  if (!args.consent || args.consent.status !== 'granted') return { state: 'suppressed', reason: 'DEDICATED_PUBLIC_GOOD_CONSENT_NOT_GRANTED', cell: null }
  return evaluatePublishedGlobalEmotionalFieldCell(args.cell)
}

export interface PrivacyTransform<TInput = unknown, TOutput = unknown> { readonly policyVersion: string; apply(input: TInput): TOutput }

export type PersonalEmotionalWeather = { state: 'off' | 'private-pattern'; purpose: 'inference.sensitive'; language: 'possible-signal' | 'pattern' | 'pressure' | 'calm' | 'mist' | 'turbulence' | 'recovery' | 'clearing'; confidence: number; sourceWindow: string }
export function evaluatePersonalEmotionalWeather(args: { consent: ConsentDecisionSnapshot | null | undefined; weather: PersonalEmotionalWeather | null | undefined }): PersonalEmotionalWeather | null {
  if (!args.consent || args.consent.purpose !== 'inference.sensitive' || args.consent.tier !== 'C4' || args.consent.status !== 'granted') return null
  if (!args.weather || args.weather.state === 'off') return null
  if (!Number.isFinite(args.weather.confidence) || args.weather.confidence < 0 || args.weather.confidence > 1) return null
  return args.weather
}
