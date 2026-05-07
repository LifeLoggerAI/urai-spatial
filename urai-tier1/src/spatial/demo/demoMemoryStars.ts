import { SpatialAssetManifest } from '../assets/manifestTypes'

export type DemoMemoryStar = {
  manifestId: string
  label: string
  title: string
  description: string
  emotionalTone: 'calm' | 'recovery' | 'threshold' | 'mirror' | 'ritual' | 'dream'
  left: string
  top: string
  size: string
  tone: 'cyan' | 'violet' | 'white' | 'pink'
}

export const DEMO_FOCUS_MANIFEST_ID = 'demo-memory-star'

export const DEMO_MEMORY_STARS: DemoMemoryStar[] = [
  {
    manifestId: 'seed-memory-bloom',
    label: 'Memory Bloom',
    title: 'Memory Bloom',
    description: 'A soft recovery bloom from a remembered moment.',
    emotionalTone: 'recovery',
    left: '18%',
    top: '33%',
    size: '18px',
    tone: 'cyan',
  },
  {
    manifestId: 'seed-recovery-arc',
    label: 'Recovery Arc',
    title: 'Recovery Arc',
    description: 'A calm return after pressure, tracked as light.',
    emotionalTone: 'recovery',
    left: '31%',
    top: '59%',
    size: '14px',
    tone: 'violet',
  },
  {
    manifestId: 'seed-threshold-storm',
    label: 'Threshold',
    title: 'Threshold Storm',
    description: 'A transition point where the inner weather changed.',
    emotionalTone: 'threshold',
    left: '45%',
    top: '36%',
    size: '20px',
    tone: 'white',
  },
  {
    manifestId: 'seed-mirror-focus',
    label: 'Mirror Focus',
    title: 'Mirror Focus',
    description: 'A clear reflective moment held in the constellation.',
    emotionalTone: 'mirror',
    left: '61%',
    top: '52%',
    size: '16px',
    tone: 'cyan',
  },
  {
    manifestId: 'seed-ritual-echo',
    label: 'Ritual Echo',
    title: 'Ritual Echo',
    description: 'A small ritual that left an emotional echo.',
    emotionalTone: 'ritual',
    left: '76%',
    top: '28%',
    size: '15px',
    tone: 'violet',
  },
  {
    manifestId: 'seed-dream-signal',
    label: 'Dream Signal',
    title: 'Dream Signal',
    description: 'A symbolic dream trace surfaced as a star.',
    emotionalTone: 'dream',
    left: '84%',
    top: '66%',
    size: '13px',
    tone: 'pink',
  },
  {
    manifestId: 'seed-calm-return',
    label: 'Calm Return',
    title: 'Calm Return',
    description: 'A grounded return to steadiness after noise.',
    emotionalTone: 'calm',
    left: '40%',
    top: '75%',
    size: '16px',
    tone: 'cyan',
  },
]

export const DEMO_MEMORY_STAR_BY_ID = Object.fromEntries(DEMO_MEMORY_STARS.map((star) => [star.manifestId, star])) as Record<string, DemoMemoryStar>

export function createDemoSpatialManifest(manifestId: string | null | undefined): SpatialAssetManifest {
  const star = manifestId ? DEMO_MEMORY_STAR_BY_ID[manifestId] : undefined
  const resolvedId = manifestId || DEMO_FOCUS_MANIFEST_ID

  return {
    manifestId: resolvedId,
    manifestVersion: '1.0',
    jobId: `demo-${resolvedId}`,
    ownerId: 'launch-demo',
    projectId: 'urai-spatial-demo',
    assetType: star?.title ?? 'Demo Memory Star',
    provider: 'urai-demo',
    model: 'css-svg-fallback',
    promptPreview: star?.description ?? 'A graceful fallback memory star for demo and local preview.',
    artifacts: [],
    spatialCompatibility: {
      supported: true,
      type: 'image_overlay',
      reason: 'Demo fallback manifest generated locally for preview mode.',
    },
  }
}

export const DEMO_SPATIAL_MANIFESTS: Record<string, SpatialAssetManifest> = {
  ...Object.fromEntries(DEMO_MEMORY_STARS.map((star) => [star.manifestId, createDemoSpatialManifest(star.manifestId)])),
  [DEMO_FOCUS_MANIFEST_ID]: createDemoSpatialManifest(DEMO_FOCUS_MANIFEST_ID),
}
