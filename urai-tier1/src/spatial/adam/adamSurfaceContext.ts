export type AdamSurfaceId =
  | 'home'
  | 'council'
  | 'support'
  | 'onboarding'
  | 'institutional-demo'
  | 'labs'
  | 'marketing'
  | 'investors'
  | 'b2b'
  | 'studio'
  | 'foundation'
  | 'general-product'

export type AdamSurfaceContext = {
  id: AdamSurfaceId
  label: string
  description: string
}

const SURFACES: Record<AdamSurfaceId, AdamSurfaceContext> = {
  home: {
    id: 'home',
    label: 'Home',
    description: 'Product orientation and founder guidance inside Home.',
  },
  council: {
    id: 'council',
    label: 'Council',
    description: 'Founder intent and product philosophy alongside the Council.',
  },
  support: {
    id: 'support',
    label: 'Support',
    description: 'Product navigation, access, privacy, accessibility, and troubleshooting.',
  },
  onboarding: {
    id: 'onboarding',
    label: 'Onboarding',
    description: 'A calm introduction to UrAi and its privacy choices.',
  },
  'institutional-demo': {
    id: 'institutional-demo',
    label: 'Institutional demo',
    description: 'A bounded synthetic/sample-data demonstration for institutional visitors.',
  },
  labs: {
    id: 'labs',
    label: 'UrAi Labs',
    description: 'Technology, research, press, and partnership orientation.',
  },
  marketing: {
    id: 'marketing',
    label: 'UrAi Marketing',
    description: 'Product positioning and onboarding orientation.',
  },
  investors: {
    id: 'investors',
    label: 'UrAi Investors',
    description: 'Authorized investor orientation with gated context only.',
  },
  b2b: {
    id: 'b2b',
    label: 'UrAi B2B',
    description: 'Authorized enterprise orientation with gated context only.',
  },
  studio: {
    id: 'studio',
    label: 'UrAi Studio',
    description: 'Creative-system and production-workflow orientation.',
  },
  foundation: {
    id: 'foundation',
    label: 'UrAi Foundation',
    description: 'Stewardship and public-interest orientation with limited authority.',
  },
  'general-product': {
    id: 'general-product',
    label: 'UrAi',
    description: 'Founder guidance for the current UrAi product surface.',
  },
}

const HIDDEN_PREFIXES = ['/login', '/signup', '/settings/privacy', '/privacy-controls']

export function resolveAdamSurface(pathname: string): AdamSurfaceContext | null {
  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null
  if (pathname === '/' || pathname === '/home' || pathname.startsWith('/home/')) return SURFACES.home
  if (pathname === '/council' || pathname.startsWith('/council/')) return SURFACES.council
  if (pathname === '/support' || pathname.startsWith('/support/')) return SURFACES.support
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) return SURFACES.onboarding
  if (pathname === '/demo' || pathname.startsWith('/demo/') || pathname.startsWith('/institutional-demo')) {
    return SURFACES['institutional-demo']
  }
  return SURFACES['general-product']
}
