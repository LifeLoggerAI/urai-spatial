import { SpatialAssetManifest } from '../assets/manifestTypes'

export type SubMapMode = 'dream' | 'relationship' | 'recovery'

export interface SubMapCluster {
  mode: SubMapMode
  label: string
  manifestIds: string[]
  headline: string
  recommendedRoute: string
  emptyCopy: string
}

function routeFor(mode: SubMapMode, manifestId?: string) {
  const query = manifestId ? `?manifestId=${encodeURIComponent(manifestId)}&mode=${mode}` : `?mode=${mode}`
  if (mode === 'dream') return `/life-map${query}`
  if (mode === 'relationship') return `/life-map${query}`
  return `/life-map${query}`
}

export function buildSubMapClusters(manifests: SpatialAssetManifest[]): SubMapCluster[] {
  const dream = manifests.filter((manifest) => manifest.memoryKind === 'dream' || manifest.emotionalWeather === 'dream')
  const relationship = manifests.filter((manifest) => manifest.memoryKind === 'person' || (manifest.relationshipArcStrength ?? 0) > 0.62)
  const recovery = manifests.filter((manifest) => manifest.memoryKind === 'recovery' || manifest.emotionalWeather === 'recovery')

  return [
    {
      mode: 'dream',
      label: 'Dream Map',
      manifestIds: dream.map((manifest) => manifest.manifestId),
      headline: dream.length ? `${dream.length} dream-layer memory star${dream.length === 1 ? '' : 's'} ready` : 'Dream map is waiting for sleep or symbolic signals',
      recommendedRoute: routeFor('dream', dream[0]?.manifestId),
      emptyCopy: 'Dream mode appears when sleep, night, symbolic, or dream-tagged memory manifests are available.',
    },
    {
      mode: 'relationship',
      label: 'Relationship Constellation',
      manifestIds: relationship.map((manifest) => manifest.manifestId),
      headline: relationship.length ? `${relationship.length} relationship arc${relationship.length === 1 ? '' : 's'} visible` : 'Relationship constellation is waiting for social signals',
      recommendedRoute: routeFor('relationship', relationship[0]?.manifestId),
      emptyCopy: 'Relationship mode appears when person, voice, social, or high arc-strength manifests are available.',
    },
    {
      mode: 'recovery',
      label: 'Recovery Timeline',
      manifestIds: recovery.map((manifest) => manifest.manifestId),
      headline: recovery.length ? `${recovery.length} recovery pattern${recovery.length === 1 ? '' : 's'} detected` : 'Recovery timeline is waiting for rebound signals',
      recommendedRoute: routeFor('recovery', recovery[0]?.manifestId),
      emptyCopy: 'Recovery mode appears when stress-to-calm, healing, or recovery manifests are available.',
    },
  ]
}

export function subMapModeCopy(mode: SubMapMode) {
  if (mode === 'dream') return 'Dream Map overlays symbolic night signals as soft constellations and memory haze.'
  if (mode === 'relationship') return 'Relationship Constellation weights arcs by emotional imprint, familiarity, and social recovery.'
  return 'Recovery Timeline highlights rebound patterns, stabilizing memories, and return-to-calm pathways.'
}
