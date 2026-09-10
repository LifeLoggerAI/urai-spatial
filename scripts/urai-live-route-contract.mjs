const globalForbiddenCopy = [
  'Full app deployment is being finalized',
  'Opening your spatial field',
  'Preparing the scene',
  'Loading URAI',
  'Help us tune the Life Movie',
  "Feedback capture is paused because Firebase isn't configured",
  'Feedback capture is paused because Firebase isn’t configured',
  'Feedback capture is paused because Firebase is not configured',
]

export const routeContracts = [
  {
    route: '/',
    required: ['aaa-final-home-sky-ground-orb-body-portals', 'Own your life.', 'Ground', 'Life Map'],
    forbidden: [],
  },
  {
    route: '/home',
    required: ['aaa-final-home-sky-ground-orb-body-portals', 'Own your life.'],
    forbidden: [],
  },
  {
    route: '/ground',
    required: [
      'walkable-first-person-ground-layer',
      'urai-ground-private-workforce-world',
      'ground-destination-compass',
      'data-ground-destination',
      'URAI Ground embodied private infrastructure',
    ],
    forbidden: ['Street-level city world'],
  },
  {
    route: '/life-map',
    required: ['URAI Life Map', 'URAI Life Map — step inside your private constellation'],
    forbidden: [],
  },
  {
    route: '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',
    required: ['urai-final-focus-chamber', 'Selected memory chamber.'],
    forbidden: ['Focus loading'],
  },
  {
    route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',
    required: ['replay-route-launch-fingerprint', 'Replay the thread. Film beats. Cinematic memory camera film.'],
    forbidden: [],
  },
  {
    route: '/mirror',
    required: ['urai-final-mirror-realm', 'See the pattern clearly.'],
    forbidden: [],
  },
  {
    route: '/passport',
    required: ['passport-ownership-vault', 'UrAi Passport', 'Ownership key'],
    forbidden: ['urai-final-passport-vault', 'Your life stays yours.'],
  },
  {
    route: '/privacy-controls',
    required: ['consent-sanctuary', 'UrAi Consent Sanctuary', 'Choose what the world may hold.', 'Enforcement:'],
    forbidden: ['privacy-consent-console', 'URAI Privacy Controls', 'Choose what the world can hold.', 'Home threshold'],
  },
  {
    route: '/location-map',
    required: ['premium-emotional-weather-atlas', 'Optional supporting layer'],
    forbidden: [],
  },
  {
    route: '/status',
    required: [
      'urai-final-status-control-room',
      'Launch locked. Proof before expansion.',
      'fingerprint-gated',
      'Production certification remains hidden until the protected fingerprint is validated.',
    ],
    forbidden: [
      'Pending proof',
      'World online. Route matrix visible.',
      'Routes implemented. Production certification pending.',
    ],
  },
  {
    route: '/spatial/ar-vr',
    required: [
      'urai-quest-explorable-world',
      'QUEST_IMMERSIVE_ENTRY_VERIFIED_MINIMAL_SHELL',
      'URAI XR ENTRY · LIVE 3D',
      'Explorable entry chamber',
    ],
    forbidden: [],
  },
]

export function normalizePath(value) {
  return value === '/' ? '/' : value.replace(/\/+$/, '') || '/'
}

export function routeVariants(baseUrl, route) {
  const original = new URL(route, baseUrl)
  if (original.pathname === '/') return [original]
  const withoutSlash = new URL(original)
  withoutSlash.pathname = normalizePath(withoutSlash.pathname)
  const withSlash = new URL(withoutSlash)
  withSlash.pathname = `${withoutSlash.pathname}/`
  return [withoutSlash, withSlash]
}

export function deployedSha(response, html) {
  const header = response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha')
  const bodyMarker = html.match(/data-deployed-sha=["']([0-9a-f]{40})["']/i)?.[1]
  const metaMarker = html.match(/name=["']urai-deployed-sha["'][^>]*content=["']([0-9a-f]{40})["']/i)?.[1]
  return (header || bodyMarker || metaMarker || '').trim().toLowerCase()
}

export function inspectRouteContent(contract, html) {
  const missingMarkers = contract.required.filter((marker) => !html.includes(marker))
  const forbiddenMarkers = [...new Set([...globalForbiddenCopy, ...contract.forbidden])]
    .filter((marker) => html.includes(marker))
  return {
    missingMarkers,
    forbiddenMarkers,
    passed: missingMarkers.length === 0 && forbiddenMarkers.length === 0,
  }
}
