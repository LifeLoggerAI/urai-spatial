export const GLOBAL_EMOTIONAL_WEATHER_STATES = [
  'Calm',
  'Reflective',
  'Energized',
  'Heavy',
  'Uncertain',
  'Hopeful',
] as const

export type GlobalEmotionalWeatherState = typeof GLOBAL_EMOTIONAL_WEATHER_STATES[number]

export type GlobalEmotionalWeatherContribution = {
  participantId: string
  consented: boolean
  capturedAt: number
  latitude: number
  longitude: number
  state: GlobalEmotionalWeatherState
  confidence: number
}

export type GlobalEmotionalWeatherPolicy = {
  enabled: boolean
  minCohort: number
  cellDegrees: number
  bucketMs: number
  maxContributionAgeMs: number
}

export type PublishedGlobalWeatherCell = {
  cellId: string
  bucketStart: number
  cohortBand: '25-49' | '50-99' | '100+'
  bounds: {
    south: number
    west: number
    north: number
    east: number
  }
  dominantState: GlobalEmotionalWeatherState
  distribution: Record<GlobalEmotionalWeatherState, number>
}

export type GlobalEmotionalWeatherSnapshot = {
  enabled: boolean
  generatedAt: number
  policy: Pick<GlobalEmotionalWeatherPolicy, 'minCohort' | 'cellDegrees' | 'bucketMs'>
  cells: PublishedGlobalWeatherCell[]
  suppressedCellCount: number
}

export const DEFAULT_GLOBAL_EMOTIONAL_WEATHER_POLICY: GlobalEmotionalWeatherPolicy = {
  enabled: false,
  minCohort: 25,
  cellDegrees: 1,
  bucketMs: 6 * 60 * 60 * 1000,
  maxContributionAgeMs: 24 * 60 * 60 * 1000,
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function normalizeGlobalWeatherPolicy(
  input: Partial<GlobalEmotionalWeatherPolicy> = {},
): GlobalEmotionalWeatherPolicy {
  const minCohort = Number.isFinite(input.minCohort) ? Math.floor(input.minCohort!) : DEFAULT_GLOBAL_EMOTIONAL_WEATHER_POLICY.minCohort
  const cellDegrees = Number.isFinite(input.cellDegrees) ? input.cellDegrees! : DEFAULT_GLOBAL_EMOTIONAL_WEATHER_POLICY.cellDegrees
  const bucketMs = Number.isFinite(input.bucketMs) ? input.bucketMs! : DEFAULT_GLOBAL_EMOTIONAL_WEATHER_POLICY.bucketMs
  const maxContributionAgeMs = Number.isFinite(input.maxContributionAgeMs)
    ? input.maxContributionAgeMs!
    : DEFAULT_GLOBAL_EMOTIONAL_WEATHER_POLICY.maxContributionAgeMs

  return {
    enabled: input.enabled === true,
    minCohort: Math.max(25, minCohort),
    cellDegrees: Math.max(1, cellDegrees),
    bucketMs: Math.max(3 * 60 * 60 * 1000, bucketMs),
    maxContributionAgeMs: Math.max(6 * 60 * 60 * 1000, maxContributionAgeMs),
  }
}

function validContribution(value: GlobalEmotionalWeatherContribution, now: number, policy: GlobalEmotionalWeatherPolicy) {
  return value.consented === true
    && typeof value.participantId === 'string'
    && value.participantId.trim().length > 0
    && Number.isFinite(value.capturedAt)
    && value.capturedAt <= now + 5 * 60 * 1000
    && value.capturedAt >= now - policy.maxContributionAgeMs
    && Number.isFinite(value.latitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && Number.isFinite(value.longitude)
    && value.longitude >= -180
    && value.longitude <= 180
    && GLOBAL_EMOTIONAL_WEATHER_STATES.includes(value.state)
    && Number.isFinite(value.confidence)
}

function bucketStart(value: number, bucketMs: number) {
  return Math.floor(value / bucketMs) * bucketMs
}

function cellFor(latitude: number, longitude: number, cellDegrees: number) {
  const latIndex = Math.floor((latitude + 90) / cellDegrees)
  const lonIndex = Math.floor((longitude + 180) / cellDegrees)
  const south = latIndex * cellDegrees - 90
  const west = lonIndex * cellDegrees - 180
  return {
    id: `cell:${latIndex}:${lonIndex}`,
    bounds: {
      south,
      west,
      north: Math.min(90, south + cellDegrees),
      east: Math.min(180, west + cellDegrees),
    },
  }
}

function cohortBand(count: number): PublishedGlobalWeatherCell['cohortBand'] {
  if (count >= 100) return '100+'
  if (count >= 50) return '50-99'
  return '25-49'
}

function emptyDistribution(): Record<GlobalEmotionalWeatherState, number> {
  return {
    Calm: 0,
    Reflective: 0,
    Energized: 0,
    Heavy: 0,
    Uncertain: 0,
    Hopeful: 0,
  }
}

function coarseDistribution(
  contributions: GlobalEmotionalWeatherContribution[],
): Record<GlobalEmotionalWeatherState, number> {
  const counts = emptyDistribution()
  for (const contribution of contributions) {
    counts[contribution.state] += clamp01(contribution.confidence)
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1
  for (const state of GLOBAL_EMOTIONAL_WEATHER_STATES) {
    counts[state] = Math.round((counts[state] / total) * 10) / 10
  }
  return counts
}

export function aggregateGlobalEmotionalWeather(
  input: GlobalEmotionalWeatherContribution[],
  policyInput: Partial<GlobalEmotionalWeatherPolicy> = {},
  now = Date.now(),
): GlobalEmotionalWeatherSnapshot {
  const policy = normalizeGlobalWeatherPolicy(policyInput)

  const base: GlobalEmotionalWeatherSnapshot = {
    enabled: policy.enabled,
    generatedAt: now,
    policy: {
      minCohort: policy.minCohort,
      cellDegrees: policy.cellDegrees,
      bucketMs: policy.bucketMs,
    },
    cells: [],
    suppressedCellCount: 0,
  }

  if (!policy.enabled) return base

  // One contribution per participant per fixed time bucket. A participant cannot
  // inflate a cohort by repeatedly contributing or by moving between cells.
  const latestByParticipantBucket = new Map<string, GlobalEmotionalWeatherContribution>()
  for (const contribution of input) {
    if (!validContribution(contribution, now, policy)) continue
    const bucket = bucketStart(contribution.capturedAt, policy.bucketMs)
    const key = `${contribution.participantId}:${bucket}`
    const current = latestByParticipantBucket.get(key)
    if (!current || contribution.capturedAt > current.capturedAt) {
      latestByParticipantBucket.set(key, contribution)
    }
  }

  const grouped = new Map<string, { bucket: number; cell: ReturnType<typeof cellFor>; contributions: GlobalEmotionalWeatherContribution[] }>()
  for (const contribution of latestByParticipantBucket.values()) {
    const bucket = bucketStart(contribution.capturedAt, policy.bucketMs)
    const cell = cellFor(contribution.latitude, contribution.longitude, policy.cellDegrees)
    const key = `${cell.id}:${bucket}`
    const group = grouped.get(key) ?? { bucket, cell, contributions: [] }
    group.contributions.push(contribution)
    grouped.set(key, group)
  }

  for (const group of grouped.values()) {
    if (group.contributions.length < policy.minCohort) {
      base.suppressedCellCount += 1
      continue
    }

    const distribution = coarseDistribution(group.contributions)
    const dominantState = [...GLOBAL_EMOTIONAL_WEATHER_STATES]
      .sort((left, right) => distribution[right] - distribution[left])[0]

    base.cells.push({
      cellId: group.cell.id,
      bucketStart: group.bucket,
      cohortBand: cohortBand(group.contributions.length),
      bounds: group.cell.bounds,
      dominantState,
      distribution,
    })
  }

  base.cells.sort((left, right) => left.bucketStart - right.bucketStart || left.cellId.localeCompare(right.cellId))
  return base
}
