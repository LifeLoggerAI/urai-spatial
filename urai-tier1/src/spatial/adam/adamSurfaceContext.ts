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
    description: 'Founder guidance for the UrAi Labs company and institutional surface without implying a live human corporate decision.',
  },
  marketing: {
    id: 'marketing',
    label: 'UrAi Marketing',
    description: 'Founder context for public product education and campaigns without fabricating endorsements, commitments, or live founder statements.',
  },
  investors: {
    id: 'investors',
    label: 'UrAi Investors',
    description: 'Founder context for the investor surface. Binding fundraising, investment, legal, financial, and on-record decisions require the human founder.',
  },
  b2b: {
    id: 'b2b',
    label: 'UrAi B2B',
    description: 'Founder context for institutional and enterprise evaluation without implying a partnership, purchase, approval, or commercial commitment.',
  },
  studio: {
    id: 'studio',
    label: 'UrAi Studio',
    description: 'Founder context for UrAi Studio, Life Movies, creative systems, provenance, and governed media workflows.',
  },
  foundation: {
    id: 'foundation',
    label: 'UrAi Foundation',
    description: 'Founder context for the public-interest Foundation surface without implying a grant, legal, governance, or institutional commitment.',
  },
  'general-product': {
    id: 'general-product',
    label: 'UrAi',
    description: 'Founder guidance for the current UrAi product surface.',
  },
}

const HIDDEN_PREFIXES = ['/login', '/signup', '/settings/privacy', '/privacy-controls']
const CROSS_PROPERTY_SURFACES = new Set<AdamSurfaceId>(['labs', 'marketing', 'investors', 'b2b', 'studio', 'foundation'])

export function resolveAdamSurface(pathname: string, requestedSurface?: string | null): AdamSurfaceContext | null {
  if (pathname === '/adam' && requestedSurface && CROSS_PROPERTY_SURFACES.has(requestedSurface as AdamSurfaceId)) {
    return SURFACES[requestedSurface as AdamSurfaceId]
  }
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
