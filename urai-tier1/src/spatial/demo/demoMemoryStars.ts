import { SpatialAssetManifest } from '../assets/manifestTypes'
import { UraiSpatialAssetPackage, createSpatialAssetPackageFromManifest } from '../assets/assetPackage'

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

export const demoArtifactByTone: Record<DemoMemoryStar['emotionalTone'], string> = {
  recovery: '/demo/memories/recovery-bloom.svg',
  threshold: '/demo/memories/threshold-storm.svg',
  mirror: '/demo/memories/mirror-focus.svg',
  ritual: '/demo/memories/ritual-echo.svg',
  dream: '/demo/memories/dream-signal.svg',
  calm: '/demo/memories/calm-return.svg',
} as const

export const DEMO_MEMORY_STARS: DemoMemoryStar[] = [
  {
    manifestId: 'seed-memory-bloom',
    label: 'Memory Bloom',
    title: 'Memory Bloom',
    description: 'A remembered recovery moment with a soft emotional lift.',
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
    description: 'A moment where pressure eased and steadiness returned.',
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
    description: 'A transition point where the emotional pattern changed.',
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
    description: 'A reflective memory about calm, attention, and self-recognition.',
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
    description: 'A repeated action that shaped the emotional pattern.',
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
    description: 'A symbolic memory trace surfaced for review.',
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
    description: 'A grounded moment where calm returned after noise.',
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
  const artifactUrl = star ? demoArtifactByTone[star.emotionalTone] : demoArtifactByTone.recovery

  return {
    manifestId: resolvedId,
    manifestVersion: '1.0',
    jobId: `demo-${resolvedId}`,
    ownerId: 'launch-demo',
    projectId: 'urai-spatial-demo',
    assetType: star?.title ?? 'Sample Memory Star',
    provider: 'urai-demo',
    model: 'css-svg-preview',
    promptPreview: star?.description ?? 'A sample local memory used to preview focus, replay, and reflection.',
    artifacts: [
      {
        artifactId: `${resolvedId}-primary-demo-image`,
        type: 'image',
        mimeType: 'image/svg+xml',
        url: artifactUrl,
        storageUri: artifactUrl,
        width: 1440,
        height: 1440,
      },
    ],
    spatialCompatibility: {
      supported: true,
      type: 'image_overlay',
      reason: 'Local preview manifest generated without private user data.',
    },
  }
}

export const DEMO_SPATIAL_MANIFESTS: Record<string, SpatialAssetManifest> = {
  ...Object.fromEntries(DEMO_MEMORY_STARS.map((star) => [star.manifestId, createDemoSpatialManifest(star.manifestId)])),
  [DEMO_FOCUS_MANIFEST_ID]: createDemoSpatialManifest(DEMO_FOCUS_MANIFEST_ID),
}

export const DEMO_SPATIAL_ASSET_PACKAGES: Record<string, UraiSpatialAssetPackage> = Object.fromEntries(
  Object.entries(DEMO_SPATIAL_MANIFESTS).map(([manifestId, manifest]) => [
    manifestId,
    createSpatialAssetPackageFromManifest(manifest, {
      scope: 'public-demo',
      createdAt: '2026-05-21T00:00:00.000Z',
      reviewState: 'approved',
      license: 'urai-demo',
      surfaces: ['focus-artifact', 'lifemap-star', 'replay-scene'],
    }),
  ]),
) as Record<string, UraiSpatialAssetPackage>
