export type HomeSceneMode =
  | 'private-personalized'
  | 'world-forming'
  | 'permission-limited'
  | 'unavailable'
  | 'offline'
  | 'explicit-sample'

export type HomeSignalKind =
  | 'memory'
  | 'relationship'
  | 'emotional-weather'
  | 'recovery'
  | 'stress'
  | 'cognitive-load'
  | 'time-of-day'
  | 'season'
  | 'location-routine'
  | 'permission-state'

export type HomeEvidenceRef = {
  readonly id: string
  readonly kind: HomeSignalKind
  readonly occurredAt?: string
  readonly sourceLabel: string
  readonly permission: string
}

export type HomeScenePlace = {
  readonly id: string
  readonly title: string
  readonly form: 'memory-place' | 'relationship-presence' | 'weather' | 'path' | 'threshold' | 'world-forming'
  readonly evidence: readonly HomeEvidenceRef[]
  readonly explanation: string
  readonly confidence: 'low' | 'medium' | 'high' | 'not-applicable'
  readonly sample: boolean
}

export type HomeSceneEnvironment = {
  readonly timeOfDay: 'dawn' | 'day' | 'dusk' | 'night' | 'unknown'
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter' | 'unknown'
  readonly weatherTone: 'clear' | 'soft' | 'active' | 'heavy' | 'recovering' | 'forming'
  readonly explanation: string
  readonly evidence: readonly HomeEvidenceRef[]
}

export type HomePersonalizedScene = {
  readonly mode: HomeSceneMode
  readonly disclosedSample: boolean
  readonly privateDataMounted: boolean
  readonly places: readonly HomeScenePlace[]
  readonly environment: HomeSceneEnvironment
  readonly generatedAt: string
}

export type HomeSceneInput = {
  readonly requestedMode: HomeSceneMode | 'auto'
  readonly signedIn: boolean
  readonly online: boolean
  readonly permissionsAvailable: boolean
  readonly dataAvailable?: boolean
  readonly evidence: readonly HomeEvidenceRef[]
  readonly now: Date
}

const emptyEnvironment = (now: Date): HomeSceneEnvironment => ({
  timeOfDay: hourToTimeOfDay(now.getHours()),
  season: monthToSeason(now.getMonth()),
  weatherTone: 'forming',
  explanation: 'Your world is beginning to form. UrAi will only shape it from information you have permitted.',
  evidence: [],
})

export function buildHomePersonalizedScene(input: HomeSceneInput): HomePersonalizedScene {
  if (input.requestedMode === 'explicit-sample') {
    return {
      mode: 'explicit-sample',
      disclosedSample: true,
      privateDataMounted: false,
      places: disclosedSamplePlaces(),
      environment: {
        ...emptyEnvironment(input.now),
        weatherTone: 'soft',
        explanation: 'Disclosed sample world. These places are examples and are not your memories.',
      },
      generatedAt: input.now.toISOString(),
    }
  }

  if (!input.online || input.requestedMode === 'offline') {
    return sceneWithoutPlaces('offline', input.now, 'UrAi is offline. Your private world remains unavailable until a secure connection returns.')
  }

  if (input.requestedMode === 'unavailable') {
    return sceneWithoutPlaces('unavailable', input.now, 'Private Home data is unavailable in this disclosed review state. No personal information is mounted here.')
  }

  if (input.requestedMode === 'permission-limited') {
    return sceneWithoutPlaces('permission-limited', input.now, 'Your world is quiet in this disclosed permission-limited state. You remain in control in Passport.')
  }

  if (input.requestedMode === 'world-forming') {
    return sceneWithoutPlaces('world-forming', input.now, 'Your world is beginning to form. UrAi will not invent memories while it learns your permitted rhythms.')
  }

  if (!input.signedIn) {
    return sceneWithoutPlaces('unavailable', input.now, 'Sign in to open your private world. No personal information is mounted here.')
  }

  if (input.dataAvailable === false) {
    return sceneWithoutPlaces('unavailable', input.now, 'UrAi could not load your permitted private Home sources. No substitute memories or sample records were mounted.')
  }

  if (!input.permissionsAvailable) {
    return sceneWithoutPlaces('permission-limited', input.now, 'Your world is quiet because the required permissions are off. You remain in control in Passport.')
  }

  if (input.evidence.length === 0) {
    return sceneWithoutPlaces('world-forming', input.now, 'Your world is beginning to form. UrAi will not invent memories while it learns your permitted rhythms.')
  }

  const places = input.evidence.slice(0, 12).map<HomeScenePlace>((evidence, index) => ({
    id: `private-place-${index}-${evidence.id}`,
    title: privateTitle(evidence.kind),
    form: formFor(evidence.kind),
    evidence: [evidence],
    explanation: `You are seeing this because ${evidence.sourceLabel} was available through ${evidence.permission}. You can inspect, correct, hide, or delete it.`,
    confidence: evidence.kind === 'time-of-day' || evidence.kind === 'season' ? 'not-applicable' : 'medium',
    sample: false,
  }))

  return {
    mode: 'private-personalized',
    disclosedSample: false,
    privateDataMounted: true,
    places,
    environment: {
      ...emptyEnvironment(input.now),
      weatherTone: deriveWeatherTone(input.evidence),
      explanation: 'The atmosphere reflects only the permitted signals listed in its explanation.',
      evidence: input.evidence.filter((item) => ['emotional-weather', 'recovery', 'stress', 'cognitive-load'].includes(item.kind)),
    },
    generatedAt: input.now.toISOString(),
  }
}

function sceneWithoutPlaces(mode: Exclude<HomeSceneMode, 'private-personalized' | 'explicit-sample'>, now: Date, explanation: string): HomePersonalizedScene {
  return {
    mode,
    disclosedSample: false,
    privateDataMounted: false,
    places: [{
      id: 'world-forming',
      title: 'Your world is forming',
      form: 'world-forming',
      evidence: [],
      explanation,
      confidence: 'not-applicable',
      sample: false,
    }],
    environment: { ...emptyEnvironment(now), explanation },
    generatedAt: now.toISOString(),
  }
}

function disclosedSamplePlaces(): readonly HomeScenePlace[] {
  return [
    {
      id: 'sample-place-of-belonging',
      title: 'A place of belonging',
      form: 'memory-place',
      evidence: [],
      explanation: 'Disclosed sample showing how a permitted memory place may appear.',
      confidence: 'not-applicable',
      sample: true,
    },
    {
      id: 'sample-recovery-path',
      title: 'A recovery path',
      form: 'path',
      evidence: [],
      explanation: 'Disclosed sample showing how a recovery pattern may shape the environment.',
      confidence: 'not-applicable',
      sample: true,
    },
  ]
}

function privateTitle(kind: HomeSignalKind) {
  const titles: Record<HomeSignalKind, string> = {
    memory: 'A recent memory',
    relationship: 'A meaningful connection',
    'emotional-weather': 'Your recent atmosphere',
    recovery: 'A recovery path',
    stress: 'A place asking for space',
    'cognitive-load': 'A quieter path',
    'time-of-day': 'Your current horizon',
    season: 'The season around you',
    'location-routine': 'A familiar rhythm',
    'permission-state': 'A private threshold',
  }
  return titles[kind]
}

function formFor(kind: HomeSignalKind): HomeScenePlace['form'] {
  if (kind === 'memory') return 'memory-place'
  if (kind === 'relationship') return 'relationship-presence'
  if (['emotional-weather', 'recovery', 'stress', 'cognitive-load'].includes(kind)) return 'weather'
  if (kind === 'permission-state') return 'threshold'
  return 'path'
}

function deriveWeatherTone(evidence: readonly HomeEvidenceRef[]): HomeSceneEnvironment['weatherTone'] {
  if (evidence.some((item) => item.kind === 'recovery')) return 'recovering'
  if (evidence.some((item) => item.kind === 'stress' || item.kind === 'cognitive-load')) return 'heavy'
  if (evidence.some((item) => item.kind === 'emotional-weather')) return 'active'
  return 'clear'
}

function hourToTimeOfDay(hour: number): HomeSceneEnvironment['timeOfDay'] {
  if (hour >= 5 && hour < 9) return 'dawn'
  if (hour >= 9 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'dusk'
  return 'night'
}

function monthToSeason(month: number): HomeSceneEnvironment['season'] {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}
