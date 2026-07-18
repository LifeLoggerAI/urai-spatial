import { buildExplicitDemoMemory, type SelectedMemory } from './selectedMemoryContract'

const QUIET_RESET_ID = 'quiet-reset'
const QUIET_RESET_MANIFEST_ID = 'replay-recovery-thread'
const NON_REPLAYABLE_SAMPLE_IDS = new Set(['ritual-marker', 'forecast-path', 'legacy-thread'])

const SAMPLE_MEMORY_CATALOG: Record<string, {
  title: string
  summary: string
  emotionalState: string
  emotionalArc: string[]
  accent: string
  light: string
  material: SelectedMemory['star']['material']
}> = {
  'memory-thread': {
    title: 'Memory Thread',
    summary: 'A disclosed demonstration of remembered moments beginning to braid into one visible thread. This is not personal data.',
    emotionalState: 'recognition',
    emotionalArc: ['arrival', 'recognition', 'continuity', 'return'],
    accent: '#8adfff',
    light: '#ddfbff',
    material: 'glass',
  },
  'seasonal-arc': {
    title: 'Seasonal Arc',
    summary: 'A disclosed demonstration of changing rhythm and inner weather across a season. This is not personal data.',
    emotionalState: 'transition',
    emotionalArc: ['weather', 'change', 'perspective', 'return'],
    accent: '#73e4ff',
    light: '#d9fbff',
    material: 'mist',
  },
  'ritual-marker': {
    title: 'Ritual Marker',
    summary: 'A disclosed demonstration of a small restorative ritual becoming a dependable return point. This is not personal data.',
    emotionalState: 'grounded',
    emotionalArc: ['pressure', 'ritual', 'settling', 'return'],
    accent: '#a980ff',
    light: '#eee6ff',
    material: 'crystal',
  },
  'forecast-path': {
    title: 'Forecast Path',
    summary: 'A disclosed demonstration of a possible next emotional-weather line, presented as possibility rather than prediction. This is not personal data.',
    emotionalState: 'uncertain',
    emotionalArc: ['signal', 'possibility', 'restraint', 'return'],
    accent: '#b68cff',
    light: '#f0e8ff',
    material: 'mist',
  },
  'threshold-moment': {
    title: 'Threshold Moment',
    summary: 'A disclosed demonstration of pressure, decision, and release converging at one turning point. This is not personal data.',
    emotionalState: 'crossing',
    emotionalArc: ['pressure', 'decision', 'release', 'return'],
    accent: '#ff7bd6',
    light: '#ffe3f6',
    material: 'ember',
  },
  'recovery-bloom': {
    title: 'Recovery Bloom',
    summary: 'A disclosed demonstration of stabilization and a softer path appearing after strain. This is not personal data.',
    emotionalState: 'relief',
    emotionalArc: ['strain', 'permission', 'recovery', 'return'],
    accent: '#7ddcff',
    light: '#dffbff',
    material: 'glass',
  },
  'relationship-echo': {
    title: 'Relationship Echo',
    summary: 'A disclosed demonstration of social tone and distance affecting the wider memory field without exposing private content. This is not personal data.',
    emotionalState: 'resonance',
    emotionalArc: ['contact', 'distance', 'resonance', 'return'],
    accent: '#d5eaff',
    light: '#f4fbff',
    material: 'crystal',
  },
  'legacy-thread': {
    title: 'Legacy Thread',
    summary: 'A disclosed demonstration of a pattern carrying meaning across a longer life arc. This is not personal data.',
    emotionalState: 'continuity',
    emotionalArc: ['memory', 'pattern', 'continuity', 'return'],
    accent: '#d1f5ff',
    light: '#f4fdff',
    material: 'glass',
  },
}

function stripDemoPrefix(id: string) {
  return id.startsWith('demo:') ? id.slice('demo:'.length) : id
}

export function isKnownExplicitDemoMemoryId(id: string | null | undefined) {
  if (!id) return false
  const key = stripDemoPrefix(id)
  return key === QUIET_RESET_ID || Object.hasOwn(SAMPLE_MEMORY_CATALOG, key)
}

export function explicitDemoReplayAvailable(id: string | null | undefined) {
  if (!id || !isKnownExplicitDemoMemoryId(id)) return false
  return !NON_REPLAYABLE_SAMPLE_IDS.has(stripDemoPrefix(id))
}

export function explicitDemoModeEnabled() {
  if (process.env.NEXT_PUBLIC_URAI_EXPLICIT_DEMO === 'true') return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('urai:lifeMapDemoMode') === 'true'
  } catch {
    return false
  }
}

export function buildNamedExplicitDemoMemory(id: string): SelectedMemory {
  const key = stripDemoPrefix(id)
  const canonicalId = `demo:${key}`
  const memory = buildExplicitDemoMemory(canonicalId)

  if (key === QUIET_RESET_ID) {
    return {
      ...memory,
      title: 'The Quiet Reset',
      summary: 'A disclosed demonstration of a quiet reset after sustained pressure. This is not personal data.',
      emotionalState: 'relief',
      emotionalArc: ['pressure', 'permission', 'reset', 'return'],
      replayManifest: {
        ...memory.replayManifest,
        id: QUIET_RESET_MANIFEST_ID,
        durationMs: 12_000,
        transcript: 'Explicit demonstration replay: pressure softens, permission appears, and the scene returns to calm.',
        segments: [
          { id: 'memory', label: 'Memory', caption: 'The pressure becomes visible.', narratorLine: 'This is an explicit demonstration memory.', startsAtMs: 0, durationMs: 2_800 },
          { id: 'emotion', label: 'Emotion', caption: 'Permission creates room to breathe.', narratorLine: 'No personal inference is being made.', startsAtMs: 2_800, durationMs: 3_000 },
          { id: 'pattern', label: 'Pattern', caption: 'The reset interrupts the old loop.', narratorLine: 'This pattern exists only in the disclosed fixture.', startsAtMs: 5_800, durationMs: 3_200 },
          { id: 'return', label: 'Return', caption: 'The scene settles into quiet.', narratorLine: 'Return to the explicit demo Focus chamber.', startsAtMs: 9_000, durationMs: 3_000 },
        ],
      },
      narrator: {
        focus: 'The pressure has fallen away. The memory is close, quiet, and ready to enter more deeply.',
        replay: 'Replay the thread from pressure through permission and return.',
      },
      star: {
        ...memory.star,
        id: QUIET_RESET_ID,
      },
    }
  }

  const fixture = SAMPLE_MEMORY_CATALOG[key]
  if (!fixture) return memory

  return {
    ...memory,
    title: fixture.title,
    summary: fixture.summary,
    emotionalState: fixture.emotionalState,
    emotionalArc: fixture.emotionalArc,
    replayManifest: {
      ...memory.replayManifest,
      id: QUIET_RESET_MANIFEST_ID,
    },
    narrator: {
      focus: fixture.summary.replace(' This is not personal data.', ''),
      replay: explicitDemoReplayAvailable(key)
        ? `Enter the disclosed ${fixture.title.toLowerCase()} demonstration more deeply.`
        : `Replay is unavailable for this disclosed ${fixture.title.toLowerCase()} fixture.`,
    },
    star: {
      ...memory.star,
      id: key,
      aura: fixture.accent,
      material: fixture.material,
    },
    visuals: {
      ...memory.visuals,
      accent: fixture.accent,
      light: fixture.light,
    },
  }
}
