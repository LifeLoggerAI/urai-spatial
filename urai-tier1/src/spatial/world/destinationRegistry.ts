import type { UraiDestination, UraiWorldLayer } from './worldTypes'

export type UraiDestinationDefinition = {
  id: UraiDestination
  label: string
  href: string
  layer: UraiWorldLayer
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
    entryPortal: 'living-world-home',
    cameraCheckpoint: 'home-threshold',
    environmentalForm: 'sky-ground-avatar-orb',
  },
  'infrastructure-hub': {
    id: 'infrastructure-hub',
    label: 'Hidden Infrastructure',
    href: '/ground',
    layer: 'infrastructure-world',
    entryPortal: 'ground-gateway',
    cameraCheckpoint: 'infrastructure-arrival',
    environmentalForm: 'underground-network',
    deepLinkAliases: ['/infrastructure'],
  },
  'life-map': {
    id: 'life-map',
    label: 'Life Map',
    href: '/life-map',
    layer: 'infrastructure-world',
    entryPortal: 'constellation-threshold',
    cameraCheckpoint: 'life-map-overview',
    environmentalForm: 'explorable-memory-constellation',
  },
  mirror: {
    id: 'mirror',
    label: 'Reflection Realm',
    href: '/mirror',
    layer: 'infrastructure-world',
    entryPortal: 'reflection-threshold',
    cameraCheckpoint: 'mirror-arrival',
    environmentalForm: 'reflective-cavern',
  },
  shadow: {
    id: 'shadow',
    label: 'Shadow Realm',
    href: '/shadow',
    layer: 'infrastructure-world',
    entryPortal: 'shadow-integration-threshold',
    cameraCheckpoint: 'shadow-arrival',
    environmentalForm: 'walkable-fracture-field',
  },
  council: {
    id: 'council',
    label: 'Council Chamber',
    href: '/council',
    layer: 'infrastructure-world',
    entryPortal: 'council-stewardship-threshold',
    cameraCheckpoint: 'council-arrival',
    environmentalForm: 'luminous-governance-chamber',
  },
  passport: {
    id: 'passport',
    label: 'Ownership Vault',
    href: '/passport',
    layer: 'infrastructure-world',
    entryPortal: 'ownership-seal',
    cameraCheckpoint: 'passport-arrival',
    environmentalForm: 'protected-vault',
  },
  'privacy-controls': {
    id: 'privacy-controls',
    label: 'Consent Sanctuary',
    href: '/privacy-controls',
    layer: 'infrastructure-world',
    entryPortal: 'consent-aperture',
    cameraCheckpoint: 'privacy-arrival',
    environmentalForm: 'permission-control-chamber',
  },
  'location-map': {
    id: 'location-map',
    label: 'Emotional Atlas',
    href: '/location-map',
    layer: 'infrastructure-world',
    entryPortal: 'location-beacon',
    cameraCheckpoint: 'atlas-world-view',
    environmentalForm: 'permission-aware-globe',
  },
  focus: {
    id: 'focus',
    label: 'Focus Chamber',
    href: '/focus',
    layer: 'infrastructure-world',
    entryPortal: 'memory-focus',
    cameraCheckpoint: 'focus-arrival',
    environmentalForm: 'selected-memory-chamber',
  },
  replay: {
    id: 'replay',
    label: 'Replay Theater',
    href: '/replay',
    layer: 'infrastructure-world',
    entryPortal: 'memory-replay',
    cameraCheckpoint: 'replay-arrival',
    environmentalForm: 'cinematic-memory-theater',
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
