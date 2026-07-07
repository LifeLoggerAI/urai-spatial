export type SpatialPlaceId =
  | 'entry-chamber'
  | 'ground-room'
  | 'life-map-sky'
  | 'focus-star'
  | 'replay-portal'
  | 'passport-room'
  | 'status-room'

export type SpatialRoutePlace = {
  readonly id: SpatialPlaceId
  readonly routePatterns: readonly string[]
  readonly title: string
  readonly motion: string
  readonly cameraState: string
  readonly assetIds: readonly string[]
}

export const spatialRoutePlaces: readonly SpatialRoutePlace[] = [
  { id: 'entry-chamber', routePatterns: ['/', '/spatial/ar-vr'], title: 'Entry Chamber', motion: 'default arrival, walkable hub, Ground below, Life Map above', cameraState: 'HOME', assetIds: ['entry-chamber-shell-v1', 'entry-floor-ring-v1', 'central-orb-v1', 'universal-portal-ring-v1', 'ground-descent-hatch-v1'] },
  { id: 'ground-room', routePatterns: ['/ground'], title: 'Ground Room', motion: 'camera descent through the hatch into the real-world layer', cameraState: 'GROUND', assetIds: ['ground-room-shell-v1', 'ground-terminal-v1', 'agent-source-station-v1'] },
  { id: 'life-map-sky', routePatterns: ['/life-map'], title: 'Life Map Sky Galaxy', motion: 'camera ascent from chamber to star field', cameraState: 'LIFEMAP', assetIds: ['life-map-sky-dome-v1', 'star-memory-node-v1'] },
  { id: 'focus-star', routePatterns: ['/focus'], title: 'Focus Star', motion: 'camera flight into the selected star', cameraState: 'FOCUS', assetIds: ['focus-star-tunnel-v1', 'star-memory-node-v1'] },
  { id: 'replay-portal', routePatterns: ['/replay'], title: 'Replay Memory Film Portal', motion: 'film portal opens from inside the star', cameraState: 'REPLAY', assetIds: ['replay-film-portal-v1'] },
  { id: 'passport-room', routePatterns: ['/passport'], title: 'Passport Identity Room', motion: 'enter identity chamber with diegetic profile objects', cameraState: 'PASSPORT', assetIds: ['passport-identity-plinth-v1'] },
  { id: 'status-room', routePatterns: ['/status'], title: 'Status Control Layer', motion: 'enter in-world launch readiness and proof control room', cameraState: 'STATUS', assetIds: ['status-control-board-v1'] },
]

export function spatialPlaceForPath(pathname: string): SpatialRoutePlace {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  return spatialRoutePlaces.find((place) => place.routePatterns.some((route) => normalized === route || normalized.startsWith(route + '/'))) ?? spatialRoutePlaces[0]
}
