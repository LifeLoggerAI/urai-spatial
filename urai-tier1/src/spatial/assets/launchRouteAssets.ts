export type LaunchRouteAsset = {
  readonly route: string
  readonly surface: string
  readonly webp: string
  readonly fallback: string
  readonly mobileWebp: string
}

const assetRoot = '/assets/urai'
const bespokeRoot = `${assetRoot}/bespoke`

export const launchRouteAssets: LaunchRouteAsset[] = [
  {
    route: '/',
    surface: 'home',
    webp: `${bespokeRoot}/home/home-threshold-bespoke-final.svg`,
    fallback: `${assetRoot}/home/home-threshold-fallback.svg`,
    mobileWebp: `${bespokeRoot}/home/home-threshold-bespoke-final-mobile.svg`,
  },
  {
    route: '/ground',
    surface: 'ground',
    webp: `${bespokeRoot}/ground/ground-world-bespoke-final.svg`,
    fallback: `${assetRoot}/ground/ground-world-fallback.svg`,
    mobileWebp: `${bespokeRoot}/ground/ground-world-bespoke-final-mobile.svg`,
  },
  {
    route: '/life-map',
    surface: 'lifemap-star',
    webp: `${assetRoot}/life-map/life-map-galaxy-main.webp`,
    fallback: `${assetRoot}/life-map/life-map-galaxy-fallback.svg`,
    mobileWebp: `${assetRoot}/life-map/life-map-galaxy-mobile.webp`,
  },
  {
    route: '/focus',
    surface: 'focus-artifact',
    webp: `${assetRoot}/focus/focus-memory-chamber-main.webp`,
    fallback: `${assetRoot}/focus/focus-memory-chamber-fallback.svg`,
    mobileWebp: `${assetRoot}/focus/focus-memory-chamber-mobile.webp`,
  },
  {
    route: '/replay',
    surface: 'replay-scene',
    webp: `${assetRoot}/replay/replay-memory-film-main.webp`,
    fallback: `${assetRoot}/replay/replay-memory-film-fallback.svg`,
    mobileWebp: `${assetRoot}/replay/replay-memory-film-mobile.webp`,
  },
  {
    route: '/mirror',
    surface: 'mirror',
    webp: `${assetRoot}/mirror/mirror-reflection-main.webp`,
    fallback: `${assetRoot}/mirror/mirror-reflection-fallback.svg`,
    mobileWebp: `${assetRoot}/mirror/mirror-reflection-mobile.webp`,
  },
  {
    route: '/passport',
    surface: 'passport',
    webp: `${assetRoot}/passport/passport-vault-main.webp`,
    fallback: `${assetRoot}/passport/passport-vault-fallback.svg`,
    mobileWebp: `${assetRoot}/passport/passport-vault-mobile.webp`,
  },
  {
    route: '/privacy-controls',
    surface: 'privacy-controls',
    webp: `${assetRoot}/privacy-controls/privacy-controls-main.webp`,
    fallback: `${assetRoot}/privacy-controls/privacy-controls-fallback.svg`,
    mobileWebp: `${assetRoot}/privacy-controls/privacy-controls-mobile.webp`,
  },
  {
    route: '/location-map',
    surface: 'location-map',
    webp: `${assetRoot}/location-map/location-emotional-weather-main.webp`,
    fallback: `${assetRoot}/location-map/location-emotional-weather-fallback.svg`,
    mobileWebp: `${assetRoot}/location-map/location-emotional-weather-mobile.webp`,
  },
  {
    route: '/status',
    surface: 'status',
    webp: `${assetRoot}/status/status-route-matrix-main.webp`,
    fallback: `${assetRoot}/status/status-route-matrix-fallback.svg`,
    mobileWebp: `${assetRoot}/status/status-route-matrix-mobile.webp`,
  },
]

function normalizeLaunchAssetRoute(route: string) {
  const clean = route.split('?')[0]?.replace(/\/$/, '') || '/'

  if (clean === '' || clean === '/' || clean === '/home' || clean === '/spatial') return '/'
  if (clean.startsWith('/ground')) return '/ground'
  if (clean.startsWith('/life-map') || clean.startsWith('/spatial/life-map')) return '/life-map'
  if (clean.startsWith('/focus')) return '/focus'
  if (clean.startsWith('/replay') || clean.includes('/replay')) return '/replay'
  if (clean.startsWith('/mirror')) return '/mirror'
  if (clean.startsWith('/passport')) return '/passport'
  if (clean.startsWith('/privacy')) return '/privacy-controls'
  if (clean.startsWith('/location-map') || clean.startsWith('/place')) return '/location-map'
  if (clean.startsWith('/status')) return '/status'

  return clean
}

export function getLaunchRouteAsset(route: string) {
  const normalizedRoute = normalizeLaunchAssetRoute(route)
  return launchRouteAssets.find((asset) => asset.route === normalizedRoute)
}
