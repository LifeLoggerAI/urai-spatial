export type ConsentDomain = 'memory' | 'location' | 'models' | 'exports' | 'workforce' | 'identity'
export type ConsentMode = 'granted' | 'limited' | 'paused' | 'denied'

export type ConsentDomainPolicy = {
  mode: ConsentMode
  retentionDays: number | null
  precise: boolean
  replayVisible: boolean
  lifeMapVisible: boolean
  modelContext: boolean
  sharingEnabled: boolean
  automationEnabled: boolean
  likenessEnabled: boolean
  updatedAt?: unknown
}

export type ConsentPolicy = {
  version: 1
  revision: number
  ownerId: string
  domains: Record<ConsentDomain, ConsentDomainPolicy>
}

export const DOMAIN_LABELS: Record<ConsentDomain, string> = {
  memory: 'Memory',
  location: 'Location',
  models: 'Models',
  exports: 'Exports and sharing',
  workforce: 'Workforce and actions',
  identity: 'Identity, relationships and legacy',
}

export const DOMAIN_ORDER: ConsentDomain[] = ['memory', 'location', 'models', 'exports', 'workforce', 'identity']

const baseDomain = (): ConsentDomainPolicy => ({
  mode: 'limited',
  retentionDays: 365,
  precise: false,
  replayVisible: true,
  lifeMapVisible: true,
  modelContext: false,
  sharingEnabled: false,
  automationEnabled: false,
  likenessEnabled: false,
})

export function defaultConsentPolicy(ownerId: string): ConsentPolicy {
  return {
    version: 1,
    revision: 0,
    ownerId,
    domains: {
      memory: { ...baseDomain(), mode: 'granted', modelContext: true },
      location: { ...baseDomain(), mode: 'limited', precise: false },
      models: { ...baseDomain(), mode: 'limited', modelContext: true },
      exports: { ...baseDomain(), mode: 'denied' },
      workforce: { ...baseDomain(), mode: 'paused' },
      identity: { ...baseDomain(), mode: 'limited' },
    },
  }
}

export function isConsentPolicy(value: unknown, ownerId: string): value is ConsentPolicy {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ConsentPolicy>
  if (candidate.version !== 1 || candidate.ownerId !== ownerId || typeof candidate.revision !== 'number') return false
  if (!candidate.domains || typeof candidate.domains !== 'object') return false
  return DOMAIN_ORDER.every((domain) => {
    const policy = candidate.domains?.[domain]
    return Boolean(policy && ['granted', 'limited', 'paused', 'denied'].includes(policy.mode))
  })
}

export function consequenceSummary(domain: ConsentDomain, next: ConsentDomainPolicy): string[] {
  const effects: string[] = []
  if (next.mode === 'denied') effects.push(`${DOMAIN_LABELS[domain]} access will be closed.`)
  if (next.mode === 'paused') effects.push(`${DOMAIN_LABELS[domain]} access will stop until resumed.`)
  if (domain === 'location' && !next.precise) effects.push('Life Map and Replay will receive approximate place context only.')
  if (domain === 'models' && !next.modelContext) effects.push('Models will stop receiving this context for new inferences.')
  if (domain === 'memory' && !next.replayVisible) effects.push('Affected memories will no longer appear in Replay.')
  if (domain === 'memory' && !next.lifeMapVisible) effects.push('Affected memories will no longer appear in Life Map.')
  if (domain === 'exports' && !next.sharingEnabled) effects.push('New share links will remain unavailable.')
  if (domain === 'workforce' && !next.automationEnabled) effects.push('Automated actions will require a new explicit authorization.')
  if (domain === 'identity' && !next.likenessEnabled) effects.push('Identity and likeness use will remain blocked.')
  if (!effects.length) effects.push('This narrows no connected feature beyond the selected scope.')
  return effects
}
