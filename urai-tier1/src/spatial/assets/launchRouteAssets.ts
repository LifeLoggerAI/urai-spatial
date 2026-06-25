export type LaunchRouteAsset = {
  readonly route: string
  readonly surface: string
  readonly webp: string
  readonly fallback: string
  readonly mobileWebp: string
}

const assetRoot = '/urai/assets'

export const launchRouteAssets: LaunchRouteAsset[] = [
  {
    route: '/',
    surface: 'home',
    webp: `${assetRoot}/home/home-threshold-main.webp`,
    fallback: `${assetRoot}/home/home-threshold-fallback.svg`,
    mobileWebp: `${assetRoot}/home/home-threshold-mobile.webp`,
  },
  {
    route: '/ground',
    surface: 'ground',
    webp: `${assetRoot}/ground/ground-world-main.webp`,
    fallback: `${assetRoot}/ground/ground-world-fallback.svg`,
    mobileWebp: `${assetRoot}/ground/ground-world-mobile.webp`,
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

export function getLaunchRouteAsset(route: string) {
  return launchRouteAssets.find((asset) => asset.route === route)
}
