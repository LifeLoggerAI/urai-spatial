export const publicIdentity = {
  productName: 'URAI',
  runtimeName: 'URAI Spatial',
  canonicalUrl: 'https://urai.app',
  repositoryUrl: 'https://github.com/LifeLoggerAI/urai-spatial',
  creator: {
    name: 'Adam Clamp',
    role: 'Founder and creator of URAI',
    profilePath: '/u/adamclamp',
  },
  description:
    'URAI is building a privacy-first spatial interface for memory, identity, reflection, focus, and personal direction.',
  publicBoundary:
    'The current public experience uses sample data and fallback-safe behavior. Production, provider, persistence, and physical-device claims remain evidence-gated.',
  disambiguation:
    'This site describes the URAI project at urai.app and the LifeLoggerAI/urai-spatial repository. It is not an assertion about unrelated organizations, products, or similarly named projects.',
} as const

export const publicIdentityJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${publicIdentity.canonicalUrl}/#organization`,
      name: publicIdentity.productName,
      url: publicIdentity.canonicalUrl,
      description: publicIdentity.description,
      founder: { '@id': `${publicIdentity.canonicalUrl}/#adam-clamp` },
      sameAs: [publicIdentity.repositoryUrl],
    },
    {
      '@type': 'Person',
      '@id': `${publicIdentity.canonicalUrl}/#adam-clamp`,
      name: publicIdentity.creator.name,
      url: `${publicIdentity.canonicalUrl}${publicIdentity.creator.profilePath}`,
      jobTitle: publicIdentity.creator.role,
      worksFor: { '@id': `${publicIdentity.canonicalUrl}/#organization` },
    },
    {
      '@type': 'WebSite',
      '@id': `${publicIdentity.canonicalUrl}/#website`,
      name: publicIdentity.runtimeName,
      url: publicIdentity.canonicalUrl,
      publisher: { '@id': `${publicIdentity.canonicalUrl}/#organization` },
      creator: { '@id': `${publicIdentity.canonicalUrl}/#adam-clamp` },
      description: publicIdentity.description,
    },
  ],
} as const
