// Canonical stored consent shape shared by server readers. Validation cannot create consent or provider enforcement.
export const CONSENT_DOMAINS = ['memory', 'location', 'models', 'exports', 'workforce', 'identity'] as const
export const CONSENT_MODES = ['granted', 'limited', 'paused', 'denied'] as const

export type ConsentDomain = (typeof CONSENT_DOMAINS)[number]
export type ConsentMode = (typeof CONSENT_MODES)[number]
type JsonMap = Record<string, unknown>

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
    state: 'pending' | 'partially-enforced' | 'fully-enforced' | 'failed' | 'conflicted'
    jobId: string | null
    affectedTargets: string[]
    providerState: 'not-applicable' | 'pending' | 'partial' | 'complete' | 'failed'
  }
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export const STORED_DOMAIN_KEYS = ['mode', 'retentionDays', 'precise', 'replayVisible', 'lifeMapVisible', 'modelContext', 'sharingEnabled', 'automationEnabled', 'likenessEnabled'] as const
export const STORED_PERMISSION_KEYS = STORED_DOMAIN_KEYS.slice(2)
export const STORED_AUTHORITY_IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/

export function ownPolicyRecord(value: unknown, required: readonly string[], optional: readonly string[] = []): value is JsonMap {
  if (!isRecord(value)) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  return required.every(key => Object.prototype.hasOwnProperty.call(descriptors, key)) && Reflect.ownKeys(descriptors).every(key =>
    typeof key === 'string' && (required.includes(key) || optional.includes(key)) && 'value' in descriptors[key],
  )
}

export function isCanonicalStoredPolicy(value: unknown, uid: string): value is ConsentPolicy {
  try {
    if (!ownPolicyRecord(value, ['version', 'revision', 'ownerId', 'domains', 'enforcement'], ['updatedAt'])
      || value.version !== 2 || typeof uid !== 'string' || !uid || value.ownerId !== uid
      || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0
      || !ownPolicyRecord(value.domains, CONSENT_DOMAINS)) return false
    for (const domain of CONSENT_DOMAINS) {
      const policy = value.domains[domain]
      if (!ownPolicyRecord(policy, STORED_DOMAIN_KEYS) || typeof policy.mode !== 'string' || !CONSENT_MODES.includes(policy.mode as ConsentMode)
        || (policy.retentionDays !== null && (typeof policy.retentionDays !== 'number' || ![30, 90, 365].includes(policy.retentionDays)))
        || STORED_PERMISSION_KEYS.some(key => typeof policy[key] !== 'boolean')) return false
    }
    const enforcement = value.enforcement
    if (!ownPolicyRecord(enforcement, ['state', 'jobId', 'affectedTargets', 'providerState'])
      || typeof enforcement.state !== 'string' || !['pending', 'partially-enforced', 'fully-enforced', 'failed', 'conflicted'].includes(enforcement.state)
      || typeof enforcement.providerState !== 'string' || !['not-applicable', 'pending', 'partial', 'complete', 'failed'].includes(enforcement.providerState)
      || (enforcement.jobId !== null && (typeof enforcement.jobId !== 'string' || !STORED_AUTHORITY_IDENTIFIER.test(enforcement.jobId)))) return false
    const targets = enforcement.affectedTargets
    if (!Array.isArray(targets) || targets.length > 1024) return false
    const descriptors = Object.getOwnPropertyDescriptors(targets)
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)) || !('value' in descriptors[key]))) return false
    const unique = new Set<string>()
    for (let index = 0; index < targets.length; index++) {
      const target = descriptors[String(index)]?.value
      if (typeof target !== 'string' || !STORED_AUTHORITY_IDENTIFIER.test(target) || unique.has(target)) return false
      unique.add(target)
    }
    return true
  } catch {
    return false
  }
}

