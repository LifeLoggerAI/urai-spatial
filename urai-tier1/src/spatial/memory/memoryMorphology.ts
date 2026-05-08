import { SpatialAssetManifest } from '../assets/manifestTypes'

export type MemoryMorphologyState =
  | 'calm'
  | 'pressure'
  | 'joy'
  | 'rupture'
  | 'recovery'
  | 'threshold'
  | 'rebirth'
  | 'social'
  | 'dream'
  | 'focus'
  | 'mirror'

export interface MemorySignalProfile {
  emotionalIntensity: number
  replayReadiness: number
  recoveryState: number
  memoryBoundary: number
  pressureScore: number
  waveformDensity: number
  particleField: number
}

export interface MemoryMorphology {
  state: MemoryMorphologyState
  title: string
  poeticLine: string
  systemLabel: string
  auraClassName: string
  tone: 'cyan' | 'violet' | 'pink' | 'gold' | 'white' | 'shadow'
  signals: MemorySignalProfile
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function normalizeHash(input: string, salt: number) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index) + salt) % 9973
  }
  return clamp01(hash / 9973)
}

function classifyMemoryState(text: string): MemoryMorphologyState {
  const copy = text.toLowerCase()
  if (/pressure|stress|compressed|overload|burnout|strain|tense/.test(copy)) return 'pressure'
  if (/joy|laugh|delight|bright|celebrat|win|love/.test(copy)) return 'joy'
  if (/rupture|break|conflict|fracture|shock/.test(copy)) return 'rupture'
  if (/recover|return|calm|heal|restor|stable|rebound/.test(copy)) return 'recovery'
  if (/threshold|transition|move|leaving|arrival|crossing/.test(copy)) return 'threshold'
  if (/rebirth|bloom|renew|becoming|again|rise/.test(copy)) return 'rebirth'
  if (/social|friend|voice|relationship|call|conversation/.test(copy)) return 'social'
  if (/dream|sleep|night/.test(copy)) return 'dream'
  if (/mirror|reflect|pattern|truth/.test(copy)) return 'mirror'
  if (/focus|attention|clarity/.test(copy)) return 'focus'
  return 'calm'
}

const stateDefaults: Record<MemoryMorphologyState, Pick<MemoryMorphology, 'tone' | 'auraClassName' | 'systemLabel' | 'poeticLine'>> = {
  calm: { tone: 'cyan', auraClassName: 'memory-star-artifact--calm', systemLabel: 'Calm memory stabilized', poeticLine: 'A quiet signal held its shape long enough to be remembered.' },
  pressure: { tone: 'shadow', auraClassName: 'memory-star-artifact--pressure', systemLabel: 'Pressure trace detected', poeticLine: 'A compressed moment left a bright edge in the nervous system.' },
  joy: { tone: 'gold', auraClassName: 'memory-star-artifact--joy', systemLabel: 'Joy flare preserved', poeticLine: 'A bright instant expanded beyond its timestamp.' },
  rupture: { tone: 'pink', auraClassName: 'memory-star-artifact--rupture', systemLabel: 'Rupture edge contained', poeticLine: 'A fracture became visible without taking over the field.' },
  recovery: { tone: 'cyan', auraClassName: 'memory-star-artifact--recovery', systemLabel: 'Recovery bloom active', poeticLine: 'A calm return after pressure, tracked as light.' },
  threshold: { tone: 'white', auraClassName: 'memory-star-artifact--threshold', systemLabel: 'Threshold crossing opened', poeticLine: 'A doorway moment separated the life before from the life after.' },
  rebirth: { tone: 'gold', auraClassName: 'memory-star-artifact--rebirth', systemLabel: 'Rebirth sequence blooming', poeticLine: 'Something old released its grip and the next self appeared.' },
  social: { tone: 'violet', auraClassName: 'memory-star-artifact--social', systemLabel: 'Social orbit resolved', poeticLine: 'Another voice bent the emotional field and left an orbit behind.' },
  dream: { tone: 'pink', auraClassName: 'memory-star-artifact--dream', systemLabel: 'Dream residue visible', poeticLine: 'A night signal surfaced with symbols still attached.' },
  focus: { tone: 'white', auraClassName: 'memory-star-artifact--focus', systemLabel: 'Focus lock stable', poeticLine: 'Attention narrowed until the memory became readable.' },
  mirror: { tone: 'violet', auraClassName: 'memory-star-artifact--mirror', systemLabel: 'Mirror pattern active', poeticLine: 'A hidden pattern reflected back without judgment.' },
}

function titleFor(manifest: SpatialAssetManifest | null, state: MemoryMorphologyState) {
  if (manifest?.promptPreview) return manifest.promptPreview
  if (manifest?.assetType) return manifest.assetType
  if (state === 'recovery') return 'A calm return after pressure'
  if (state === 'threshold') return 'A doorway moment opened'
  if (state === 'rebirth') return 'A new self began to bloom'
  return 'A memory star opened gently'
}

export function buildMemoryMorphology(manifest: SpatialAssetManifest | null, fallbackState: MemoryMorphologyState = 'recovery'): MemoryMorphology {
  const seed = [manifest?.manifestId, manifest?.assetType, manifest?.promptPreview].filter(Boolean).join(' ') || fallbackState
  const state = manifest ? classifyMemoryState(seed) : fallbackState
  const defaults = stateDefaults[state]
  const intensity = 0.34 + normalizeHash(seed, 11) * 0.58
  const recovery = state === 'recovery' || state === 'calm' || state === 'rebirth' ? 0.62 + normalizeHash(seed, 23) * 0.28 : 0.28 + normalizeHash(seed, 23) * 0.38
  const pressure = state === 'pressure' || state === 'rupture' || state === 'threshold' ? 0.62 + normalizeHash(seed, 37) * 0.28 : 0.16 + normalizeHash(seed, 37) * 0.36

  return {
    state,
    title: titleFor(manifest, state),
    poeticLine: defaults.poeticLine,
    systemLabel: defaults.systemLabel,
    auraClassName: defaults.auraClassName,
    tone: defaults.tone,
    signals: {
      emotionalIntensity: clamp01(intensity),
      replayReadiness: clamp01(0.56 + normalizeHash(seed, 41) * 0.34),
      recoveryState: clamp01(recovery),
      memoryBoundary: clamp01(0.62 + normalizeHash(seed, 53) * 0.3),
      pressureScore: clamp01(pressure),
      waveformDensity: clamp01(0.38 + normalizeHash(seed, 67) * 0.46),
      particleField: clamp01(0.42 + normalizeHash(seed, 79) * 0.44),
    },
  }
}
