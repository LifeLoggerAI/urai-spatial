import type { UraiDestination, UraiWorldLayer } from './worldTypes'

export type UraiDestinationDefinition = {
  id: UraiDestination
  label: string
  href: string
  layer: UraiWorldLayer
  /** Canonical spatial entry relationship. This does not imply a literal portal visual. */
  entryAnchor: string
  /** @deprecated Compatibility alias retained for serialized routes and older callers. */
  entryPortal: string
  cameraCheckpoint: string
  environmentalForm: string
  deepLinkAliases?: readonly string[]
}

export const URAI_DESTINATION_REGISTRY: Record<UraiDestination, UraiDestinationDefinition> = {
  home: {
    id: 'home',
    label: 'Living World',
    href: '/home',
    layer: 'living-world',
    entryAnchor: 'living-world-home',
    entryPortal: 'living-world-home',
    cameraCheckpoint: 'home-threshold',
    environmentalForm: 'first-person-living-world',
  },
  'infrastructure-hub': {
    // Compatibility id retained while the public /ground authority is the lived physical world.
    id: 'infrastructure-hub',
    label: 'Ground',
    href: '/ground',
    layer: 'living-world',
    entryAnchor: 'home-ground',
    entryPortal: 'home-ground',
    cameraCheckpoint: 'ground-first-person-arrival',
    environmentalForm: 'lived-physical-world',
    deepLinkAliases: ['/infrastructure'],
  },
  'life-map': {
    id: 'life-map',
    label: 'Life Map',
    href: '/life-map',
    layer: 'infrastructure-world',
    entryAnchor: 'home-sky',
    entryPortal: 'constellation-threshold',
    cameraCheckpoint: 'life-map-overview',
    environmentalForm: 'explorable-personal-universe',
  },
  mirror: {
    id: 'mirror',
    label: 'Reflection Realm',
    href: '/mirror',
    layer: 'infrastructure-world',
    entryAnchor: 'reflection-threshold',
    entryPortal: 'reflection-threshold',
    cameraCheckpoint: 'mirror-arrival',
    environmentalForm: 'reflective-cavern',
  },
  shadow: {
    id: 'shadow',
    label: 'Shadow Realm',
    href: '/shadow',
    layer: 'infrastructure-world',
    entryAnchor: 'shadow-integration-threshold',
    entryPortal: 'shadow-integration-threshold',
    cameraCheckpoint: 'shadow-arrival',
    environmentalForm: 'walkable-fracture-field',
  },
  council: {
    id: 'council',
    label: 'Council Chamber',
    href: '/council',
    layer: 'infrastructure-world',
    entryAnchor: 'council-stewardship-threshold',
    entryPortal: 'council-stewardship-threshold',
    cameraCheckpoint: 'council-arrival',
    environmentalForm: 'luminous-governance-chamber',
  },
  passport: {
    id: 'passport',
    label: 'Ownership Vault',
    href: '/passport',
    layer: 'infrastructure-world',
    entryAnchor: 'ownership-seal',
    entryPortal: 'ownership-seal',
    cameraCheckpoint: 'passport-arrival',
    environmentalForm: 'protected-vault',
  },
  'privacy-controls': {
    id: 'privacy-controls',
    label: 'Consent Sanctuary',
    href: '/privacy-controls',
    layer: 'infrastructure-world',
    entryAnchor: 'consent-sanctuary',
    entryPortal: 'consent-aperture',
    cameraCheckpoint: 'privacy-arrival',
    environmentalForm: 'permission-control-chamber',
  },
  'location-map': {
    id: 'location-map',
    label: 'Emotional Atlas',
    href: '/location-map',
    layer: 'infrastructure-world',
    entryAnchor: 'location-beacon',
    entryPortal: 'location-beacon',
    cameraCheckpoint: 'atlas-world-view',
    environmentalForm: 'permission-aware-globe',
  },
  focus: {
    id: 'focus',
    label: 'Focus',
    href: '/focus',
    layer: 'infrastructure-world',
    entryAnchor: 'selected-memory',
    entryPortal: 'memory-focus',
    cameraCheckpoint: 'focus-arrival',
    environmentalForm: 'selected-memory-manifestation',
  },
  replay: {
    id: 'replay',
    label: 'Replay',
    href: '/replay',
    layer: 'infrastructure-world',
    entryAnchor: 'memory-replay',
    entryPortal: 'memory-replay',
    cameraCheckpoint: 'replay-arrival',
    environmentalForm: 'spatial-temporal-memory-reconstruction',
  },
}

const PATH_DESTINATIONS: readonly [string, UraiDestination][] = [
  ['/privacy-controls', 'privacy-controls'],
  ['/location-map', 'location-map'],
  ['/infrastructure', 'infrastructure-hub'],
  ['/ground', 'infrastructure-hub'],
  ['/life-map', 'life-map'],
  ['/passport', 'passport'],
  ['/council', 'council'],
  ['/shadow', 'shadow'],
  ['/mirror', 'mirror'],
  ['/focus', 'focus'],
  ['/replay', 'replay'],
  ['/home', 'home'],
  ['/', 'home'],
]

export function destinationForPathname(pathname: string): UraiDestination | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const match = PATH_DESTINATIONS.find(([path]) => normalized === path || (path !== '/' && normalized.startsWith(`${path}/`)))
  return match?.[1] ?? null
}

export function definitionForDestination(destination: UraiDestination) {
  return URAI_DESTINATION_REGISTRY[destination]
}

export function isInfrastructureDestination(destination: UraiDestination) {
  return URAI_DESTINATION_REGISTRY[destination].layer === 'infrastructure-world'
}
