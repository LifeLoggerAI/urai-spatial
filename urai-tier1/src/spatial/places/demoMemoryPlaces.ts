import { DEMO_MEMORY_STARS } from '../demo/demoMemoryStars'
import { MemoryPlace, MemoryPlaceResolution } from './memoryPlaceSchema'

const DEMO_TIMESTAMP = '2026-05-21T00:00:00.000Z'

const presetByTone = {
  calm: 'quiet-grounding-room',
  recovery: 'recovery-garden-place',
  threshold: 'threshold-hallway',
  mirror: 'mirror-focus-room',
  ritual: 'ritual-table-room',
  dream: 'dream-signal-room',
} as const

const auraByTone = {
  calm: '#9be7d8',
  recovery: '#8ef2c6',
  threshold: '#f7f1ff',
  mirror: '#b8f4ff',
  ritual: '#c8a6ff',
  dream: '#f0a8ff',
} as const

export const DEMO_MEMORY_PLACES: MemoryPlace[] = DEMO_MEMORY_STARS.map((star, index) => {
  const id = `place-${star.manifestId}`
  return {
    id,
    userId: null,
    title: `${star.title} Place`,
    memoryIds: [star.manifestId],
    kind: 'symbolic',
    category: star.emotionalTone === 'threshold' ? 'event' : 'home',
    locationPrivacy: 'symbolic-only',
    reconstruction: {
      scenePreset: presetByTone[star.emotionalTone],
      layoutPreset: 'single-room-symbolic',
      terrainPreset: 'quiet-memory-floor',
      skyPreset: 'soft-interior-sky',
      weatherPreset: star.emotionalTone,
      lightingPreset: 'gentle-memory-light',
      soundPreset: `${star.emotionalTone}-place-ambient`,
      objectPackIds: [`${star.emotionalTone}-starter-pack`],
    },
    emotionalOverlay: {
      mood: star.emotionalTone,
      intensity: star.emotionalTone === 'threshold' ? 0.82 : star.emotionalTone === 'recovery' ? 0.68 : 0.55,
      auraColor: auraByTone[star.emotionalTone],
      fogLevel: star.emotionalTone === 'threshold' ? 0.52 : 0.18,
      distortionLevel: star.emotionalTone === 'threshold' ? 0.28 : 0.06,
      bloomLevel: star.emotionalTone === 'recovery' ? 0.72 : 0.34,
      memoryEchoLevel: 0.48,
    },
    navigation: {
      spawnPoint: [0, 1.4, 4 + index * 0.1],
      exitPortalPosition: [0, 1.6, -4],
      walkable: true,
      cameraMode: 'float',
    },
    privacyLevel: 'demo',
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  }
})

export const DEMO_MEMORY_PLACE_BY_ID: Record<string, MemoryPlace> = Object.fromEntries(
  DEMO_MEMORY_PLACES.map((place) => [place.id, place]),
)

export function resolveDemoMemoryPlace(placeId: string | undefined | null): MemoryPlaceResolution {
  if (!placeId) return { ok: false, status: 404, reason: 'missing-memory-place-id', safeHref: '/life-map' }
  const place = DEMO_MEMORY_PLACE_BY_ID[placeId]
  if (!place) return { ok: false, status: 404, reason: 'unknown-memory-place', safeHref: '/life-map' }
  return { ok: true, status: 200, place }
}
