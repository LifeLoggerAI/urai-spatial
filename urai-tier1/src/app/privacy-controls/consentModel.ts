export type ConsentDomain = 'memory' | 'location' | 'models' | 'exports' | 'workforce' | 'identity'
export type ConsentMode = 'granted' | 'limited' | 'paused' | 'denied'
export type EnforcementState = 'pending' | 'partially-enforced' | 'fully-enforced' | 'failed' | 'conflicted'

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
}

export type ConsentPolicy = {
  version: 2
  revision: number
  ownerId: string
  domains: Record<ConsentDomain, ConsentDomainPolicy>
  enforcement: {
    state: EnforcementState
    jobId: string | null
    affectedTargets: string[]
    providerState: 'not-applicable' | 'pending' | 'partial' | 'complete' | 'failed'
  }
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
    version: 2,
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
    enforcement: {
      state: 'fully-enforced',
      jobId: null,
      affectedTargets: [],
      providerState: 'not-applicable',
    },
  }
}

const DOMAIN_POLICY_KEYS = ['mode', 'retentionDays', 'precise', 'replayVisible', 'lifeMapVisible', 'modelContext', 'sharingEnabled', 'automationEnabled', 'likenessEnabled'] as const
const PERMISSION_KEYS = DOMAIN_POLICY_KEYS.slice(2)
const AUTHORITY_IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/

function ownRecord(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  return required.every(key => Object.hasOwn(descriptors, key)) && keys.every(key =>
    typeof key === 'string' && (required.includes(key) || optional.includes(key)) && 'value' in descriptors[key],
  )
}

export function isConsentPolicy(value: unknown, ownerId: string): value is ConsentPolicy {
  try {
    // Malformed snapshots never unlock private controls or imply enforcement.
    if (!ownRecord(value, ['version', 'revision', 'ownerId', 'domains', 'enforcement'], ['updatedAt'])) return false
    if (value.version !== 2 || typeof ownerId !== 'string' || !ownerId || value.ownerId !== ownerId
      || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0) return false
    if (!ownRecord(value.domains, DOMAIN_ORDER)) return false
    for (const domain of DOMAIN_ORDER) {
      const policy = value.domains[domain]
      if (!ownRecord(policy, DOMAIN_POLICY_KEYS) || typeof policy.mode !== 'string' || !['granted', 'limited', 'paused', 'denied'].includes(policy.mode)
        || (policy.retentionDays !== null && (typeof policy.retentionDays !== 'number' || ![30, 90, 365].includes(policy.retentionDays)))
        || PERMISSION_KEYS.some(key => typeof policy[key] !== 'boolean')) return false
    }
    const enforcement = value.enforcement
    if (!ownRecord(enforcement, ['state', 'jobId', 'affectedTargets', 'providerState'])
      || typeof enforcement.state !== 'string' || !['pending', 'partially-enforced', 'fully-enforced', 'failed', 'conflicted'].includes(enforcement.state)
      || typeof enforcement.providerState !== 'string' || !['not-applicable', 'pending', 'partial', 'complete', 'failed'].includes(enforcement.providerState)
      || (enforcement.jobId !== null && (typeof enforcement.jobId !== 'string' || !AUTHORITY_IDENTIFIER.test(enforcement.jobId)))) return false
    const targets = enforcement.affectedTargets
    if (!Array.isArray(targets) || targets.length > 1024) return false
    const descriptors = Object.getOwnPropertyDescriptors(targets)
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)) || !('value' in descriptors[key]))) return false
    const unique = new Set<string>()
    for (let index = 0; index < targets.length; index++) {
      const target = descriptors[String(index)]?.value
      if (typeof target !== 'string' || !AUTHORITY_IDENTIFIER.test(target) || unique.has(target)) return false
      unique.add(target)
    }
    return true
  } catch {
    return false
  }
}

export function consequenceSummary(domain: ConsentDomain, next: ConsentDomainPolicy): string[] {
  const effects: string[] = []
  if (next.mode === 'denied') effects.push(`${DOMAIN_LABELS[domain]} access will close for new collection and processing.`)
  if (next.mode === 'paused') effects.push(`${DOMAIN_LABELS[domain]} collection and processing will pause until resumed.`)
  if (domain === 'location' && !next.precise) effects.push('Life Map and Replay will receive approximate place context only.')
  if (domain === 'models' && !next.modelContext) effects.push('New model inferences will not receive this context.')
  if (domain === 'memory' && !next.replayVisible) effects.push('Affected memories will no longer appear in Replay.')
  if (domain === 'memory' && !next.lifeMapVisible) effects.push('Affected memories will no longer appear in Life Map.')
  if (domain === 'exports' && !next.sharingEnabled) effects.push('New exports and share links will remain unavailable.')
  if (domain === 'workforce' && !next.automationEnabled) effects.push('External actions will require a new explicit authorization.')
  if (domain === 'identity' && !next.likenessEnabled) effects.push('Identity, likeness and legacy use will remain blocked.')
  effects.push('The change is not complete until every repository-controlled target reports enforcement; provider work may remain pending or fail separately.')
  return effects
}
