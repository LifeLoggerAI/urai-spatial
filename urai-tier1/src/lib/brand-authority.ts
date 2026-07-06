export const URAI_CANONICAL_URL = 'https://urai.app'
export const URAI_BRAND_NAME = 'URAI Labs'
export const URAI_PRODUCT_NAME = 'URAI'
export const URAI_CREATOR_NAME = 'Adam Clamp'

export const URAI_PUBLIC_DESCRIPTION =
  'URAI Labs, created by Adam Clamp, builds URAI: a privacy-first spatial experience for memory, reflection, relationships, and personal ownership.'

export const URAI_DISAMBIGUATION =
  'URAI Labs is the organization behind the URAI product at urai.app. It is not ARAI Labs, URAI S.p.A., the CoCoSys neuroscience lab, Roots URAI industrial blowers, or other unrelated organizations and products that use the name Urai.'

export const uraiOrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${URAI_CANONICAL_URL}/#organization`,
  name: URAI_BRAND_NAME,
  alternateName: [URAI_PRODUCT_NAME, 'URAI Spatial'],
  url: URAI_CANONICAL_URL,
  logo: `${URAI_CANONICAL_URL}/icon.svg`,
  description: URAI_PUBLIC_DESCRIPTION,
  disambiguatingDescription: URAI_DISAMBIGUATION,
  member: {
    '@type': 'Person',
    '@id': `${URAI_CANONICAL_URL}/about#adam-clamp`,
    name: URAI_CREATOR_NAME,
    url: `${URAI_CANONICAL_URL}/about`,
    jobTitle: 'Creator of URAI',
  },
  sameAs: ['https://github.com/LifeLoggerAI'],
} as const

export const uraiWebsiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${URAI_CANONICAL_URL}/#website`,
  url: URAI_CANONICAL_URL,
  name: `${URAI_BRAND_NAME} — ${URAI_PRODUCT_NAME}`,
  alternateName: ['URAI', 'URAI Spatial'],
  description: URAI_PUBLIC_DESCRIPTION,
  publisher: {
    '@id': `${URAI_CANONICAL_URL}/#organization`,
  },
  inLanguage: 'en-US',
} as const

export const uraiPersonSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${URAI_CANONICAL_URL}/about#adam-clamp`,
  name: URAI_CREATOR_NAME,
  url: `${URAI_CANONICAL_URL}/about`,
  jobTitle: 'Creator of URAI',
  memberOf: {
    '@id': `${URAI_CANONICAL_URL}/#organization`,
  },
  knowsAbout: [
    'privacy-first spatial computing',
    'personal memory interfaces',
    'human-centered artificial intelligence',
    'accessible spatial experiences',
  ],
} as const
