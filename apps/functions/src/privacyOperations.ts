import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { revokePersonPresenceConsentDerivatives } from './personPresenceAuthority'
import { createHash, randomBytes } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { exportPrivateLifeModelHandles, tombstonePrivateLifeModelInputs } from './lifeModelPrivateInputs'
import { collectExportPages, createExportReadBudget, requireExportReadBudget, chargeExportValue, EXPORT_RESOURCE_LIMITS, type ExportReadBudget } from './exportPagination'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const fieldValue = admin.firestore.FieldValue
const timestamp = admin.firestore.Timestamp

const CONSENT_DOMAINS = ['memory', 'location', 'models', 'exports', 'workforce', 'identity'] as const
const CONSENT_MODES = ['granted', 'limited', 'paused', 'denied'] as const
const EXPORT_SCOPES = ['profile', 'consent', 'memories', 'spatial', 'life-model', 'intelligence', 'audit'] as const
const DELETION_SCOPES = [
  'export-history',
  'privacy-history',
  'memories',
  'spatial-state',
  'life-model',
  'intelligence',
  'all-repository-data',
  'account',
] as const

type ConsentDomain = (typeof CONSENT_DOMAINS)[number]
type ConsentMode = (typeof CONSENT_MODES)[number]
type ExportScope = (typeof EXPORT_SCOPES)[number]
type DeletionScope = (typeof DELETION_SCOPES)[number]
type JsonMap = Record<string, unknown>

type ConsentDomainPolicy = {
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

type ConsentPolicy = {
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

const REAUTH_WINDOW_SECONDS = 5 * 60
const EXPORT_EXPIRY_MS = 15 * 60 * 1000
const ACCOUNT_GRACE_MS = 24 * 60 * 60 * 1000
const MAX_EXPORT_RUNTIME_ASSETS = 1000
const MAX_EXPORT_RUNTIME_BYTES = 512 * 1024 * 1024
type ExportReadContext = { transaction: FirebaseFirestore.Transaction; budget: ExportReadBudget }

function requireUid(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireRecentAuthentication(context: functions.https.CallableContext) {
  requireUid(context)
  const authTime = context.auth?.token.auth_time
  const now = Math.floor(Date.now() / 1000)
  if (typeof authTime !== 'number' || !Number.isSafeInteger(authTime) || authTime <= 0
    || authTime > now || now - authTime > REAUTH_WINDOW_SECONDS) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'RECENT_REAUTHENTICATION_REQUIRED',
      { maximumAgeSeconds: REAUTH_WINDOW_SECONDS },
    )
  }
}

function requireOperationId(value: unknown): string {
  const operationId = String(value ?? '')
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(operationId)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid operationId is required.')
  }
  return operationId
}

function requireString(value: unknown, label: string, maxLength = 240): string {
  const output = String(value ?? '').trim()
  if (!output || output.length > maxLength) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  }
  return output
}

function stableId(uid: string, operationId: string, purpose: string): string {
  return createHash('sha256').update(`${purpose}:${uid}:${operationId}`).digest('hex').slice(0, 40)
}

function ownerDigest(uid: string): string {
  return createHash('sha256').update(`urai-owner:${uid}`).digest('hex')
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function defaultDomain(): ConsentDomainPolicy {
  return {
    mode: 'limited',
    retentionDays: 365,
    precise: false,
    replayVisible: true,
    lifeMapVisible: true,
    modelContext: false,
    sharingEnabled: false,
    automationEnabled: false,
    likenessEnabled: false,
  }
}

function defaultPolicy(uid: string): ConsentPolicy {
  return {
    version: 2,
    revision: 0,
    ownerId: uid,
    domains: {
      memory: { ...defaultDomain(), mode: 'granted', modelContext: true },
      location: { ...defaultDomain(), mode: 'limited' },
      models: { ...defaultDomain(), mode: 'limited', modelContext: true },
      exports: { ...defaultDomain(), mode: 'denied' },
      workforce: { ...defaultDomain(), mode: 'paused' },
      identity: { ...defaultDomain(), mode: 'limited' },
    },
    enforcement: {
      state: 'fully-enforced',
      jobId: null,
      affectedTargets: [],
      providerState: 'not-applicable',
    },
  }
}

function parseDomainPolicy(value: unknown): ConsentDomainPolicy {
  if (!isRecord(value)) throw new functions.https.HttpsError('invalid-argument', 'Invalid consent policy.')
  const mode = String(value.mode ?? '') as ConsentMode
  if (!CONSENT_MODES.includes(mode)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid consent mode.')
  }
  const retentionValue = value.retentionDays
  const retentionDays = retentionValue === null ? null : Number(retentionValue)
  if (retentionDays !== null && ![30, 90, 365].includes(retentionDays)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid retention period.')
  }
  const booleanFields = [
    'precise',
    'replayVisible',
    'lifeMapVisible',
    'modelContext',
    'sharingEnabled',
    'automationEnabled',
    'likenessEnabled',
  ] as const
  for (const key of booleanFields) {
    if (typeof value[key] !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', `Invalid ${key} value.`)
    }
  }
  return {
    mode,
    retentionDays,
    precise: value.precise as boolean,
    replayVisible: value.replayVisible as boolean,
    lifeMapVisible: value.lifeMapVisible as boolean,
    modelContext: value.modelContext as boolean,
    sharingEnabled: value.sharingEnabled as boolean,
    automationEnabled: value.automationEnabled as boolean,
    likenessEnabled: value.likenessEnabled as boolean,
  }
}

function parseStoredPolicy(value: unknown, uid: string): ConsentPolicy {
  if (!isRecord(value) || value.ownerId !== uid || !isRecord(value.domains)) return defaultPolicy(uid)
  const domains = {} as Record<ConsentDomain, ConsentDomainPolicy>
  for (const domain of CONSENT_DOMAINS) domains[domain] = parseDomainPolicy(value.domains[domain])
  const enforcement = isRecord(value.enforcement) ? value.enforcement : {}
  return {
    version: 2,
    revision: Number(value.revision ?? 0),
    ownerId: uid,
    domains,
    enforcement: {
      state: ['pending', 'partially-enforced', 'fully-enforced', 'failed', 'conflicted'].includes(String(enforcement.state))
        ? (String(enforcement.state) as ConsentPolicy['enforcement']['state'])
        : 'fully-enforced',
      jobId: typeof enforcement.jobId === 'string' ? enforcement.jobId : null,
      affectedTargets: Array.isArray(enforcement.affectedTargets)
        ? enforcement.affectedTargets.filter((item): item is string => typeof item === 'string')
        : [],
      providerState: ['not-applicable', 'pending', 'partial', 'complete', 'failed'].includes(String(enforcement.providerState))
        ? (String(enforcement.providerState) as ConsentPolicy['enforcement']['providerState'])
        : 'not-applicable',
    },
  }
}

function affectedTargets(domain: ConsentDomain, next: ConsentDomainPolicy): string[] {
  const targets = new Set<string>(['privacy-authority'])
  if (domain === 'memory') {
    targets.add('memory-collection')
    targets.add('replay-visibility')
    targets.add('life-map-visibility')
  }
  if (domain === 'location') {
    targets.add('location-collection')
    targets.add('location-precision')
    targets.add('location-retention')
    targets.add('captured-reality-runtime')
  }
  if (domain === 'models') {
    targets.add('model-context-retrieval')
    targets.add('derived-processing')
  }
  if (domain === 'exports') {
    targets.add('export-creation')
    targets.add('share-links')
  }
  if (domain === 'workforce') {
    targets.add('workforce-actions')
    targets.add('communication-jobs')
    targets.add('calendar-actions')
  }
  if (domain === 'identity') {
    targets.add('identity-derived-systems')
    targets.add('relationship-derived-systems')
    targets.add('likeness-legacy-use')
  }
  if (next.mode === 'denied' || next.mode === 'paused') targets.add('pending-work-cancellation')
  return [...targets]
}

function consentEnabled(policy: ConsentDomainPolicy): boolean {
  return policy.mode !== 'denied' && policy.mode !== 'paused'
}

function publicJobState(data: JsonMap) {
  return {
    jobId: String(data.jobId ?? ''),
    state: String(data.state ?? 'unknown'),
    revision: Number(data.revision ?? 0),
    receiptId: typeof data.receiptId === 'string' ? data.receiptId : null,
    providerState: typeof data.providerState === 'string' ? data.providerState : null,
  }
}

export const applyConsentPolicy = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const operationId = requireOperationId(data?.operationId)
  const domain = String(data?.domain ?? '') as ConsentDomain
  if (!CONSENT_DOMAINS.includes(domain)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown consent domain.')
  }
  const next = parseDomainPolicy(data?.next)
  const expectedRevision = Number(data?.expectedRevision)
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid expected revision.')
  }

  const jobId = stableId(uid, operationId, 'consent')
  const receiptId = stableId(uid, operationId, 'consent-receipt')
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const jobRef = db.doc(`privacyEnforcementJobs/${jobId}`)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${receiptId}`)
  const targets = affectedTargets(domain, next)

  const result = await db.runTransaction(async (transaction) => {
    const [policySnapshot, jobSnapshot] = await Promise.all([
      transaction.get(policyRef),
      transaction.get(jobRef),
    ])
    if (jobSnapshot.exists) return publicJobState(jobSnapshot.data() as JsonMap)

    const current = policySnapshot.exists ? parseStoredPolicy(policySnapshot.data(), uid) : defaultPolicy(uid)
    if (current.revision !== expectedRevision) {
      throw new functions.https.HttpsError('aborted', 'CONSENT_REVISION_CONFLICT', {
        currentRevision: current.revision,
      })
    }

    const nextPolicy: ConsentPolicy = {
      ...current,
      revision: current.revision + 1,
      domains: { ...current.domains, [domain]: next },
      enforcement: {
        state: 'pending',
        jobId,
        affectedTargets: targets,
        providerState: 'pending',
      },
    }
    const now = fieldValue.serverTimestamp()
    transaction.set(policyRef, { ...nextPolicy, updatedAt: now })
    transaction.create(jobRef, {
      jobId,
      operationId,
      uid,
      domain,
      previous: current.domains[domain],
      next,
      revision: nextPolicy.revision,
      affectedTargets: targets,
      state: 'requested',
      providerState: 'pending',
      receiptId,
      requestedAt: now,
      updatedAt: now,
    })
    transaction.create(receiptRef, {
      receiptId,
      ownerId: uid,
      kind: 'consent',
      domain,
      revision: nextPolicy.revision,
      previousMode: current.domains[domain].mode,
      nextMode: next.mode,
      result: 'requested',
      jobId,
      createdAt: now,
      updatedAt: now,
    })
    return { jobId, state: 'requested', revision: nextPolicy.revision, receiptId, providerState: 'pending' }
  })

  return result
})

async function revokeLifeModelDerivativesForConsent(uid: string, reasonId: string) {
  return revokePersonPresenceConsentDerivatives(db, uid, reasonId, fieldValue.serverTimestamp())
}

async function enforceConsentJob(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const job = snapshot.data() as JsonMap | undefined
  if (!job || typeof job.uid !== 'string' || typeof job.domain !== 'string') return
  if (['fully-enforced', 'partially-enforced', 'failed'].includes(String(job.state))) return

  const uid = job.uid
  const domain = job.domain as ConsentDomain
  if (!CONSENT_DOMAINS.includes(domain)) return
  const next = parseDomainPolicy(job.next)
  const revision = Number(job.revision)
  const jobId = snapshot.id
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${String(job.receiptId)}`)
  const providerSnapshot = await db.collection(`users/${uid}/providerConnections`).limit(100).get()
  const relevantProviders = providerSnapshot.docs.filter((item) => {
    const domains = item.get('consentDomains')
    return !Array.isArray(domains) || domains.includes(domain)
  })

  try {
    await snapshot.ref.update({ state: 'validating', updatedAt: fieldValue.serverTimestamp() })
    const batch = db.batch()
    const targets = Array.isArray(job.affectedTargets)
      ? job.affectedTargets.filter((item): item is string => typeof item === 'string')
      : affectedTargets(domain, next)
    for (const target of targets) {
      batch.set(db.doc(`users/${uid}/privacyRuntime/${target}`), {
        ownerId: uid,
        target,
        domain,
        revision,
        enabled: consentEnabled(next),
        mode: next.mode,
        precise: next.precise,
        replayVisible: next.replayVisible,
        lifeMapVisible: next.lifeMapVisible,
        modelContext: next.modelContext,
        sharingEnabled: next.sharingEnabled,
        automationEnabled: next.automationEnabled,
        likenessEnabled: next.likenessEnabled,
        retentionDays: next.retentionDays,
        sourceJobId: jobId,
        updatedAt: fieldValue.serverTimestamp(),
      }, { merge: true })
    }
    batch.set(db.doc(`users/${uid}`), {
      consents: {
        [domain]: consentEnabled(next),
        [`${domain}Mode`]: next.mode,
      },
      privacyRevision: revision,
      updatedAt: fieldValue.serverTimestamp(),
    }, { merge: true })

    const revoking = next.mode === 'denied' || next.mode === 'paused'
    for (const provider of relevantProviders) {
      batch.set(provider.ref, {
        processingAllowed: consentEnabled(next),
        consentRevision: revision,
        revocationState: revoking ? 'requested' : 'not-required',
        revocationRequestedAt: revoking ? fieldValue.serverTimestamp() : null,
        updatedAt: fieldValue.serverTimestamp(),
      }, { merge: true })
      if (revoking) {
        const queueId = stableId(uid, `${jobId}:${provider.id}`, 'provider-revocation')
        batch.set(db.doc(`providerRevocationQueue/${queueId}`), {
          queueId,
          uid,
          providerId: provider.id,
          domain,
          revision,
          sourceJobId: jobId,
          state: 'requested',
          createdAt: fieldValue.serverTimestamp(),
          updatedAt: fieldValue.serverTimestamp(),
        }, { merge: false })
      }
    }

    const providerState = relevantProviders.length > 0 && revoking ? 'pending' : 'not-applicable'
    const state = providerState === 'pending' ? 'partially-enforced' : 'fully-enforced'
    batch.update(snapshot.ref, {
      state,
      providerState,
      repositoryTargets: targets.map((target) => ({ target, state: 'enforced' })),
      completedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    })
    batch.update(policyRef, {
      'enforcement.state': state,
      'enforcement.providerState': providerState,
      'enforcement.jobId': jobId,
      updatedAt: fieldValue.serverTimestamp(),
    })
    batch.update(receiptRef, {
      result: state,
      providerState,
      completedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    })
    await batch.commit()
    if (revoking && (domain === 'models' || domain === 'identity')) {
      await revokeLifeModelDerivativesForConsent(uid, `consent:${jobId}:${domain}`)
    }
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 240) : 'UNKNOWN_ENFORCEMENT_FAILURE'
    await Promise.all([
      snapshot.ref.set({ state: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
      policyRef.set({
        enforcement: {
          state: 'failed',
          jobId,
          affectedTargets: Array.isArray(job.affectedTargets) ? job.affectedTargets : [],
          providerState: 'failed',
        },
        updatedAt: fieldValue.serverTimestamp(),
      }, { merge: true }),
      receiptRef.set({ result: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
    ])
    throw error
  }
}

export const processPrivacyEnforcementJob = functions.firestore
  .document('privacyEnforcementJobs/{jobId}')
  .onCreate(async (snapshot) => enforceConsentJob(snapshot))

function parseExportScopes(value: unknown): ExportScope[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'At least one export scope is required.')
  }
  const scopes = [...new Set(value.map(String))] as ExportScope[]
  if (scopes.some((scope) => !EXPORT_SCOPES.includes(scope))) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown export scope.')
  }
  return scopes
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (!isRecord(value)) return value
  const output: JsonMap = {}
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|api.?key|credential|privateMediaUrl|rawAudioUrl|runtimeObject|sourceLocator|exactLocation|privateObject/i.test(key)) continue
    output[key] = redactSecrets(item)
  }
  return output
}

async function collectionDocuments(ref: FirebaseFirestore.CollectionReference, context: ExportReadContext) {
  return boundedCollectionDocuments(ref, context)
}

async function boundedCollectionDocuments(ref: FirebaseFirestore.CollectionReference, context: ExportReadContext) {
  return collectExportPages(context.transaction, ref, context.budget, item => ({ ...redactSecrets(item.data()) as JsonMap, id: item.id }))
}

async function scenarioExportTree(userRef: FirebaseFirestore.DocumentReference, context: ExportReadContext) {
  const scenarios = await collectionDocuments(userRef.collection('scenarios'), context)
  const output: JsonMap[] = []
  // Sequential nested reads share the same snapshot and finite resource budget.
  for (const scenario of scenarios) {
    const ref = userRef.collection('scenarios').doc(String(scenario.id))
    output.push({ ...scenario,
      basis: await collectionDocuments(ref.collection('basis'), context),
      branches: await collectionDocuments(ref.collection('branches'), context),
      comparisons: await collectionDocuments(ref.collection('comparisons'), context),
      outcomeObservations: await collectionDocuments(ref.collection('outcomeObservations'), context),
      calibration: await collectionDocuments(ref.collection('calibration'), context),
    })
  }
  return output
}

type CapturedRealityRuntimeExport = {
  assetId: string
  objectPath: string
  relativePath: string
  runtimeSha256: string
  storageGeneration: string
  exportGeneration: string
  runtimeBytes: number
}

function requireCapturedRealityExportObject(uid: string, assetId: string, value: unknown): string {
  const objectPath = String(value ?? '')
  const prefix = `private-captured-reality/${uid}/${assetId}/runtime/`
  if (!objectPath.startsWith(prefix) || objectPath.includes('..')) {
    throw new Error('CAPTURED_REALITY_EXPORT_OBJECT_BOUNDARY_INVALID')
  }
  return objectPath
}

async function copyCapturedRealityRuntimeExports(
  assets: JsonMap[],
  uid: string,
  basePath: string,
  budget: ExportReadBudget,
  requireCurrentAuthority: () => Promise<unknown>,
): Promise<CapturedRealityRuntimeExport[]> {
  const bucket = admin.storage().bucket()
  const exports: CapturedRealityRuntimeExport[] = []
  let totalBytes = 0
  for (const asset of assets) {
    requireExportReadBudget(budget)
    await requireCurrentAuthority()
    if (asset.ownerId !== uid) continue
    const runtimeObject = asset.runtimeObject
    if (typeof runtimeObject !== 'string' || !runtimeObject) continue
    const assetId = String(asset.id)
    const objectPath = requireCapturedRealityExportObject(uid, assetId, runtimeObject)
    const runtimeSha256 = String(asset.runtimeSha256 ?? '').toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(runtimeSha256) || !objectPath.endsWith(`/${runtimeSha256}.splat`)) {
      throw new Error('CAPTURED_REALITY_EXPORT_HASH_BINDING_INVALID')
    }

    const sourceFile = bucket.file(objectPath)
    const [metadata] = await sourceFile.getMetadata()
    const storageGeneration = String(metadata.generation ?? '')
    const storedSha256 = String(metadata.metadata?.uraiRuntimeSha256 ?? '').toLowerCase()
    const expectedGeneration = String(asset.runtimeStorageGeneration ?? '')
    if (
      !/^\d+$/.test(storageGeneration) ||
      storedSha256 !== runtimeSha256 ||
      (expectedGeneration && expectedGeneration !== storageGeneration)
    ) {
      throw new Error('CAPTURED_REALITY_EXPORT_RUNTIME_CHANGED')
    }

    const runtimeBytes = Number(metadata.size ?? 0)
    if (!Number.isSafeInteger(runtimeBytes) || runtimeBytes <= 0) {
      throw new Error('CAPTURED_REALITY_EXPORT_RUNTIME_SIZE_INVALID')
    }
    totalBytes += runtimeBytes
    if (exports.length >= MAX_EXPORT_RUNTIME_ASSETS || totalBytes > MAX_EXPORT_RUNTIME_BYTES) throw new Error('EXPORT_RESOURCE_BUDGET_EXCEEDED')

    const relativePath = `spatial/captured-reality/${assetId}/${runtimeSha256}.splat`
    const destination = bucket.file(`${basePath}/${relativePath}`)
    const immutableSource = bucket.file(objectPath, { generation: storageGeneration })
    const digest = createHash('sha256')
    let sourceBytes = 0
    const sourceStream = immutableSource.createReadStream()
    try {
      for await (const incoming of sourceStream) {
        requireExportReadBudget(budget)
        await requireCurrentAuthority()
        const bytes = Buffer.from(incoming)
        sourceBytes += bytes.length
        if (!Number.isSafeInteger(sourceBytes) || sourceBytes > runtimeBytes) throw new Error('CAPTURED_REALITY_EXPORT_RUNTIME_SIZE_CHANGED')
        digest.update(bytes)
      }
    } finally { sourceStream.destroy() }
    if (sourceBytes !== runtimeBytes || digest.digest('hex') !== runtimeSha256) throw new Error('CAPTURED_REALITY_EXPORT_RUNTIME_CHECKSUM_CHANGED')
    await requireCurrentAuthority()
    await immutableSource.copy(destination)
    await destination.setMetadata({ contentType: 'application/octet-stream', metadata: { ownerUid: uid, checksum: runtimeSha256 } })
    const [copiedMetadata] = await destination.getMetadata()
    const exportGeneration = String(copiedMetadata.generation ?? '')
    if (!/^[1-9][0-9]{0,39}$/.test(exportGeneration) || Number(copiedMetadata.size) !== runtimeBytes
      || copiedMetadata.contentType !== 'application/octet-stream') throw new Error('CAPTURED_REALITY_EXPORT_GENERATION_REQUIRED')
    exports.push({
      assetId,
      objectPath: `${basePath}/${relativePath}`,
      relativePath,
      runtimeSha256,
      storageGeneration,
      exportGeneration,
      runtimeBytes,
    })
  }
  return exports
}

function exportFenceRef(uid: string) {
  return db.doc(`users/${uid}/privacyRuntime/exportAuthority`)
}

function canonicalExportExpiry(value: unknown): number {
  let expiry = Number.NaN
  try {
    expiry = isRecord(value) && typeof value.toMillis === 'function' ? (value.toMillis as () => number)()
      : typeof value === 'string' ? Date.parse(value) : typeof value === 'number' ? value : Number.NaN
  } catch { /* A malformed canonical deadline cannot grant authority. */ }
  return Number.isSafeInteger(expiry) && expiry > Date.now() ? expiry : Number.NaN
}

async function readExportSubject(transaction: FirebaseFirestore.Transaction, uid: string) {
  const [user, policy, fence, deletions, canonical, canonicalFence] = await Promise.all([
    transaction.get(db.doc(`users/${uid}`)),
    transaction.get(db.doc(`users/${uid}/privacyPolicy/current`)),
    transaction.get(exportFenceRef(uid)),
    transaction.get(db.collection(`users/${uid}/deletionJobs`).where('state', 'in', ['awaiting-grace', 'queued', 'in-progress', 'failed']).limit(1)),
    transaction.get(db.doc(`consentRecords/${uid}_data_export`)),
    transaction.get(db.doc(`privacyDeletionTombstones/${uid}`)),
  ])
  const stored = policy.data()
  const generation = fence.exists ? fence.get('generation') : 0
  const pending = fence.get('pendingDeletions')
  const grant = canonical.data()
  const canonicalExportConsentExpiresAt = canonicalExportExpiry(grant?.expiresAt)
  // The canonical C7 receipt is read-only here. An operational policy, stale
  // projection or compatibility record cannot independently grant data.export.
  if (!canonical.exists || grant?.uid !== uid || grant.purpose !== 'data.export' || grant.consentTier !== 'C7'
    || grant.policyVersion !== '1.0.0' || grant.status !== 'granted'
    || typeof grant.receiptHash !== 'string' || !/^[a-f0-9]{64}$/.test(grant.receiptHash)
    || !Number.isSafeInteger(canonicalExportConsentExpiresAt) || !canonicalFence.exists || canonicalFence.get('uid') !== uid
    || canonicalFence.get('active') === true || canonicalFence.get('exportConsentStatus') !== 'granted'
    || canonicalFence.get('exportConsentReceiptHash') !== grant.receiptHash || canonicalFence.get('exportConsentPolicyVersion') !== '1.0.0'
    || canonicalExportExpiry(canonicalFence.get('exportConsentExpiresAt')) !== canonicalExportConsentExpiresAt) {
    throw new functions.https.HttpsError('failed-precondition', 'CANONICAL_EXPORT_CONSENT_REQUIRED')
  }
  if (!user.exists || !policy.exists || stored?.ownerId !== uid || stored.version !== 2
    || !Number.isSafeInteger(stored.revision) || stored.revision < 1
    || stored.domains?.exports?.mode !== 'granted'
    || stored.enforcement?.state !== 'fully-enforced'
    || user.get('deleted') === true || ['deleting', 'deleted', 'disabled'].includes(String(user.get('accountStatus') ?? ''))
    || !Number.isSafeInteger(generation) || generation < 0
    || (fence.exists && !isRecord(pending)) || (isRecord(pending) && Object.keys(pending).length > 0) || !deletions.empty) {
    throw new functions.https.HttpsError('failed-precondition', 'CURRENT_EXPORT_AUTHORITY_REQUIRED')
  }
  return { consentRevision: stored.revision as number, exportFenceGeneration: generation as number,
    canonicalExportReceiptHash: grant.receiptHash as string, canonicalExportConsentExpiresAt }
}

async function readBoundExport(transaction: FirebaseFirestore.Transaction, uid: string, jobId: string, state: string) {
  const job = await transaction.get(db.doc(`users/${uid}/exportJobs/${jobId}`))
  if (!job.exists || job.get('uid') !== uid || job.get('state') !== state) {
    throw new functions.https.HttpsError('failed-precondition', 'Export is unavailable.')
  }
  const receiptId = requireDocumentId(job.get('receiptId'), 'receiptId', 80)
  const [subject, receipt] = await Promise.all([
    readExportSubject(transaction, uid),
    transaction.get(db.doc(`users/${uid}/privacyReceipts/${receiptId}`)),
  ])
  if (job.get('consentRevision') !== subject.consentRevision || job.get('exportFenceGeneration') !== subject.exportFenceGeneration
    || job.get('canonicalExportReceiptHash') !== subject.canonicalExportReceiptHash
    || job.get('canonicalExportConsentExpiresAt') !== subject.canonicalExportConsentExpiresAt
    || !receipt.exists || receipt.get('ownerId') !== uid || receipt.get('kind') !== 'export' || receipt.get('jobId') !== jobId
    || receipt.get('consentRevision') !== subject.consentRevision || receipt.get('exportFenceGeneration') !== subject.exportFenceGeneration
    || receipt.get('canonicalExportReceiptHash') !== subject.canonicalExportReceiptHash
    || receipt.get('canonicalExportConsentExpiresAt') !== subject.canonicalExportConsentExpiresAt
    || (state === 'ready' && receipt.get('result') !== 'ready')) {
    throw new functions.https.HttpsError('failed-precondition', 'EXPORT_RECEIPT_OR_REVISION_CHANGED')
  }
  return { job, receipt, subject }
}

function requireDocumentId(value: unknown, label: string, maximum: number) {
  const id = requireString(value, label, maximum)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new functions.https.HttpsError('invalid-argument', `Invalid ${label}.`)
  return id
}

export const createExportRequest = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  requireRecentAuthentication(context)
  const operationId = requireOperationId(data?.operationId)
  const scopes = parseExportScopes(data?.scopes)
  const jobId = stableId(uid, operationId, 'export')
  const receiptId = stableId(uid, operationId, 'export-receipt')
  const jobRef = db.doc(`users/${uid}/exportJobs/${jobId}`)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${receiptId}`)
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(jobRef)
    if (existing.exists) {
      await readBoundExport(transaction, uid, jobId, String(existing.get('state')))
      if (JSON.stringify(existing.get('scopes')) !== JSON.stringify(scopes)) {
        throw new functions.https.HttpsError('failed-precondition', 'Export operation identity changed.')
      }
      return publicJobState(existing.data() as JsonMap)
    }
    const authority = await readExportSubject(transaction, uid)
    const now = fieldValue.serverTimestamp()
    transaction.create(jobRef, { jobId, uid, scopes, ...authority, state: 'queued', progress: 0, receiptId, createdAt: now, updatedAt: now })
    transaction.create(receiptRef, { receiptId, ownerId: uid, kind: 'export', scopes, jobId, ...authority, result: 'queued', createdAt: now, updatedAt: now })
    return { jobId, state: 'queued', receiptId }
  })
})

async function buildExport(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const job = snapshot.data() as JsonMap | undefined
  if (!job || typeof job.uid !== 'string' || !Array.isArray(job.scopes)) return
  if (String(job.state) !== 'queued') return
  const uid = job.uid
  const scopes = parseExportScopes(job.scopes)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${String(job.receiptId)}`)
  const bucket = admin.storage().bucket()
  const basePath = `private-exports/${uid}/${snapshot.id}`
  let claimed = false
  try {
    await db.runTransaction(async (transaction) => {
      await readBoundExport(transaction, uid, snapshot.id, 'queued')
      transaction.update(snapshot.ref, { state: 'preparing', progress: 10, updatedAt: fieldValue.serverTimestamp() })
    })
    claimed = true
    const userRef = db.doc(`users/${uid}`)
    const payload: JsonMap = {
      schema: 'urai-user-export-v1',
      createdAt: new Date().toISOString(),
      scopes,
      exclusions: [
        'provider credentials and access tokens',
        'security-only internal signals',
        'records that are legally required to remain outside a portable export',
      ],
      data: {},
    }
    const data = payload.data as JsonMap
    const budget = createExportReadBudget()
    let runtimeInventory: JsonMap[] = []
    let capturedRealityRuntimeExports: CapturedRealityRuntimeExport[] = []
    await db.runTransaction(async transaction => {
    await readBoundExport(transaction, uid, snapshot.id, 'preparing')
    const context = { transaction, budget }
    if (scopes.includes('profile')) {
      const profile = await transaction.get(userRef)
      data.profile = profile.exists ? redactSecrets(profile.data()) : null
      chargeExportValue(budget, data.profile)
    }
    if (scopes.includes('consent')) {
      data.privacyPolicy = await collectionDocuments(userRef.collection('privacyPolicy'), context)
      data.privacyRuntime = await collectionDocuments(userRef.collection('privacyRuntime'), context)
    }
    if (scopes.includes('memories')) {
      data.memories = await collectionDocuments(userRef.collection('memories'), context)
      data.replayEvents = await collectionDocuments(userRef.collection('replayEvents'), context)
      data.spatialMemories = await collectionDocuments(userRef.collection('spatialMemories'), context)
    }
    if (scopes.includes('life-model')) {
      data.lifeEntities = await collectionDocuments(userRef.collection('lifeEntities'), context)
      data.lifeEntityStates = await collectionDocuments(userRef.collection('lifeEntityStates'), context)
      data.lifeClaims = await collectionDocuments(userRef.collection('lifeClaims'), context)
      data.lifeRelationships = await collectionDocuments(userRef.collection('lifeRelationships'), context)
      data.lifeEvents = await collectionDocuments(userRef.collection('lifeEvents'), context)
      data.lifeCausalEdges = await collectionDocuments(userRef.collection('lifeCausalEdges'), context)
      data.lifeGraphSnapshots = await collectionDocuments(userRef.collection('lifeGraphSnapshots'), context)
      data.lifeCorrections = await collectionDocuments(userRef.collection('lifeCorrections'), context)
      data.lifeConflicts = await collectionDocuments(userRef.collection('lifeConflicts'), context)
      data.knowledgeGaps = await collectionDocuments(userRef.collection('knowledgeGaps'), context)
      data.personModelBundles = await collectionDocuments(userRef.collection('personModelBundles'), context)
      data.personRenderBindings = await collectionDocuments(userRef.collection('personRenderBindings'), context)
      data.sceneTruthPackets = await collectionDocuments(userRef.collection('sceneTruthPackets'), context)
      data.renderManifests = await collectionDocuments(userRef.collection('renderManifests'), context)
      data.simulationSessions = await collectionDocuments(userRef.collection('simulationSessions'), context)
      data.lifeModelReceipts = await collectionDocuments(userRef.collection('lifeModelReceipts'), context)
      data.privateLifeModelSources = await boundedCollectionDocuments(userRef.collection('privateLifeModelSources'), context)
      data.privateLifeModelTranscripts = await boundedCollectionDocuments(userRef.collection('privateLifeModelTranscripts'), context)
      data.privateLifeModelProvenance = await boundedCollectionDocuments(userRef.collection('privateLifeModelProvenance'), context)
      data.privateLifeModelSourceHandles = redactSecrets(await exportPrivateLifeModelHandles(db, uid, transaction, budget))
    }
    if (scopes.includes('intelligence')) {
      data.scenarios = await scenarioExportTree(userRef, context)
      data.aiLedger = await collectionDocuments(userRef.collection('aiLedger'), context)
    }
    if (scopes.includes('spatial')) {
      data.homeWorld = await collectionDocuments(userRef.collection('homeWorld'), context)
      data.focusStates = await collectionDocuments(userRef.collection('focusStates'), context)
      data.transitionStates = await collectionDocuments(userRef.collection('transitionStates'), context)
      data.spatialAnchors = await collectionDocuments(userRef.collection('spatialAnchors'), context)
      data.behaviorSignals = await collectionDocuments(userRef.collection('behaviorSignals'), context)
      data.voiceEvents = await collectionDocuments(userRef.collection('voiceEvents'), context)
      data.locations = await collectionDocuments(userRef.collection('locations'), context)
      data.capturedRealityAssets = await collectionDocuments(userRef.collection('capturedRealityAssets'), context)
      data.capturedRealityReplayBindings = await collectionDocuments(userRef.collection('capturedRealityReplayBindings'), context)
      runtimeInventory = await collectExportPages(transaction, userRef.collection('capturedRealityAssets'), budget, asset => ({ id: asset.id, ownerId: asset.get('ownerId'), runtimeObject: asset.get('runtimeObject') ?? null, runtimeSha256: asset.get('runtimeSha256') ?? null, runtimeStorageGeneration: asset.get('runtimeStorageGeneration') ?? null }))
    }
    if (scopes.includes('audit')) {
      data.receipts = await collectionDocuments(userRef.collection('privacyReceipts'), context)
    }

    }, { readOnly: true })
    requireExportReadBudget(budget)
    if (budget.snapshotMillis !== null) payload.snapshotReadAt = new Date(budget.snapshotMillis).toISOString()
    payload.resourceLimits = EXPORT_RESOURCE_LIMITS
    const requireCurrentAuthority = () => db.runTransaction(transaction => readBoundExport(transaction, uid, snapshot.id, 'preparing'))
    await requireCurrentAuthority()
    if (scopes.includes('spatial')) {
      capturedRealityRuntimeExports = await copyCapturedRealityRuntimeExports(runtimeInventory, uid, basePath, budget, requireCurrentAuthority)
      data.capturedRealityRuntimeAssets = capturedRealityRuntimeExports.map(({ objectPath: _privateObject, ...entry }) => entry)
    }
    // Keep the signed manifest inventory inside Firestore's 1-MiB document limit.
    if (Buffer.byteLength(JSON.stringify(capturedRealityRuntimeExports)) > 768 * 1024) throw new Error('EXPORT_RESOURCE_BUDGET_EXCEEDED')
    const json = JSON.stringify(payload, null, 2)
    if (Buffer.byteLength(json) > 32 * 1024 * 1024) throw new Error('EXPORT_RESOURCE_BUDGET_EXCEEDED')
    const checksum = createHash('sha256').update(json).digest('hex')
    const manifest = JSON.stringify({
      schema: 'urai-user-export-manifest-v1',
      jobId: snapshot.id,
      checksumAlgorithm: 'sha256',
      checksum,
      scopes,
      runtimeAssets: capturedRealityRuntimeExports.map(({ objectPath: _privateObject, ...entry }) => entry),
      createdAt: new Date().toISOString(),
    }, null, 2)
    const manifestChecksum = createHash('sha256').update(manifest).digest('hex')
    await Promise.all([
      bucket.file(`${basePath}/export.json`).save(Buffer.from(json), {
        resumable: false,
        contentType: 'application/json',
        metadata: { metadata: { ownerUid: uid, jobId: snapshot.id, checksum } },
      }),
      bucket.file(`${basePath}/manifest.json`).save(Buffer.from(manifest), {
        resumable: false,
        contentType: 'application/json',
        metadata: { metadata: { ownerUid: uid, jobId: snapshot.id, checksum: manifestChecksum } },
      }),
    ])
    const [exportMetadata, manifestMetadata] = await Promise.all([
      bucket.file(`${basePath}/export.json`).getMetadata(), bucket.file(`${basePath}/manifest.json`).getMetadata(),
    ])
    const exportGeneration = String(exportMetadata[0].generation ?? '')
    const manifestGeneration = String(manifestMetadata[0].generation ?? '')
    const exportBytes = Number(exportMetadata[0].size), manifestBytes = Number(manifestMetadata[0].size)
    if (!/^[1-9][0-9]{0,39}$/.test(exportGeneration) || !/^[1-9][0-9]{0,39}$/.test(manifestGeneration)
      || exportBytes !== Buffer.byteLength(json) || manifestBytes !== Buffer.byteLength(manifest)
      || exportMetadata[0].contentType !== 'application/json' || manifestMetadata[0].contentType !== 'application/json') {
      throw new Error('EXPORT_OBJECT_GENERATION_OR_METADATA_REQUIRED')
    }
    await db.runTransaction(async (transaction) => {
      const { subject } = await readBoundExport(transaction, uid, snapshot.id, 'preparing')
      const expiresAt = timestamp.fromMillis(Math.min(Date.now() + 7 * 24 * 60 * 60 * 1000, subject.canonicalExportConsentExpiresAt))
      transaction.update(snapshot.ref, {
        state: 'ready', progress: 100, checksum, checksumAlgorithm: 'sha256',
        exportObject: `${basePath}/export.json`, manifestObject: `${basePath}/manifest.json`,
        exportGeneration, manifestGeneration, exportBytes, manifestBytes, manifestChecksum,
        runtimeExports: capturedRealityRuntimeExports, expiresAt,
        completedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp(),
      })
      transaction.update(receiptRef, { result: 'ready', checksum, checksumAlgorithm: 'sha256', expiresAt,
        completedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() })
    })
  } catch (error) {
    if (!claimed) throw error
    // A reply can fail after a successful publication. Preserve committed bytes
    // and receipts; an unavailable read also cannot authorize cleanup.
    const current = await snapshot.ref.get().catch(() => null)
    if (!current || (current.exists && current.get('state') === 'ready')) throw error
    await bucket.deleteFiles({ prefix: `${basePath}/` })
    await db.runTransaction(async (transaction) => {
      const [freshJob, freshReceipt] = await Promise.all([transaction.get(snapshot.ref), transaction.get(receiptRef)])
      if (!freshJob.exists || freshJob.get('uid') !== uid || !['queued', 'preparing'].includes(String(freshJob.get('state')))
        || !freshReceipt.exists || freshReceipt.get('ownerId') !== uid || freshReceipt.get('kind') !== 'export') return
      transaction.update(snapshot.ref, { state: 'failed', failureCode: error instanceof Error && error.message === 'EXPORT_RESOURCE_BUDGET_EXCEEDED' ? 'EXPORT_RESOURCE_BUDGET_EXCEEDED' : 'EXPORT_AUTHORITY_OR_BUILD_FAILED', updatedAt: fieldValue.serverTimestamp() })
      transaction.update(receiptRef, { result: 'failed', failureCode: error instanceof Error && error.message === 'EXPORT_RESOURCE_BUDGET_EXCEEDED' ? 'EXPORT_RESOURCE_BUDGET_EXCEEDED' : 'EXPORT_AUTHORITY_OR_BUILD_FAILED', updatedAt: fieldValue.serverTimestamp() })
    })
    throw error
  }
}

export const processExportJob = functions.runWith({ timeoutSeconds: 540 }).firestore
  .document('users/{uid}/exportJobs/{jobId}')
  .onCreate(async (snapshot) => buildExport(snapshot))

type ExportFile = 'export' | 'manifest' | 'runtime'
function exportSelection(data: JsonMap) {
  const jobId = requireDocumentId(data.jobId, 'jobId', 80)
  if (data.file !== undefined && !['export', 'manifest', 'runtime'].includes(String(data.file))) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid export file.')
  }
  const file = (data.file ?? 'export') as ExportFile
  const assetId = file === 'runtime' ? requireDocumentId(data.assetId, 'assetId', 128) : null
  if (file !== 'runtime' && data.assetId != null) throw new functions.https.HttpsError('invalid-argument', 'Unexpected runtime asset.')
  return { jobId, file, assetId }
}

async function readDownloadAuthority(transaction: FirebaseFirestore.Transaction, uid: string, selection: ReturnType<typeof exportSelection>) {
  const { jobId, file, assetId } = selection
  const { job, subject } = await readBoundExport(transaction, uid, jobId, 'ready')
  const expiresAt = job.get('expiresAt')
  const packageExpiresAt = expiresAt instanceof admin.firestore.Timestamp ? expiresAt.toMillis() : Number.NaN
  if (!Number.isSafeInteger(packageExpiresAt) || packageExpiresAt <= Date.now() || packageExpiresAt > subject.canonicalExportConsentExpiresAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Export has expired or its authority lifetime changed.')
  }
  let path = '', generation = '', checksum = '', byteLength = Number.NaN
  const contentType = file === 'runtime' ? 'application/octet-stream' : 'application/json'
  if (file === 'runtime') {
    const items = job.get('runtimeExports')
    const matches = Array.isArray(items) ? items.filter((entry) => isRecord(entry) && entry.assetId === assetId) : []
    if (matches.length === 1 && isRecord(matches[0])) {
      path = String(matches[0].objectPath ?? '')
      generation = String(matches[0].exportGeneration ?? '')
      checksum = String(matches[0].runtimeSha256 ?? '')
      byteLength = Number(matches[0].runtimeBytes)
    }
  } else {
    path = String(job.get(file === 'manifest' ? 'manifestObject' : 'exportObject') ?? '')
    generation = String(job.get(file === 'manifest' ? 'manifestGeneration' : 'exportGeneration') ?? '')
    checksum = String(job.get(file === 'manifest' ? 'manifestChecksum' : 'checksum') ?? '')
    byteLength = Number(job.get(file === 'manifest' ? 'manifestBytes' : 'exportBytes'))
  }
  const expected = file === 'runtime'
    ? `private-exports/${uid}/${jobId}/spatial/captured-reality/${assetId}/${checksum}.splat`
    : `private-exports/${uid}/${jobId}/${file}.json`
  if (path !== expected || !/^[1-9][0-9]{0,39}$/.test(generation) || !/^[a-f0-9]{64}$/.test(checksum)
    || !Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Export object binding is invalid. Create a new export.')
  }
  const authorityHash = createHash('sha256').update(JSON.stringify({ uid, jobId, file, assetId, path, generation, checksum, byteLength, contentType,
    ...subject, receiptId: job.get('receiptId'), packageExpiresAt })).digest('hex')
  return { path, generation, checksum, byteLength, contentType, packageExpiresAt,
    canonicalExportConsentExpiresAt: subject.canonicalExportConsentExpiresAt, authorityHash }
}

function exportProject() {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (project === 'urai-4dc1d') return project
  if (process.env.FUNCTIONS_EMULATOR === 'true' && project && /^demo-[a-z0-9-]{1,50}$/.test(project)) return project
  throw new functions.https.HttpsError('failed-precondition', 'Spatial project authority is not bound.')
}
function exportDownloadEndpoint(host: string | undefined) {
  const project = exportProject()
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    if (!host || !/^(?:localhost|127\.0\.0\.1):[0-9]{2,5}$/.test(host)) {
      throw new functions.https.HttpsError('failed-precondition', 'Local export endpoint unavailable.')
    }
    return `http://${host}/${project}/us-central1/downloadOperationalExportPackage`
  }
  return `https://us-central1-${project}.cloudfunctions.net/downloadOperationalExportPackage`
}

function auditExportDownload(transaction: FirebaseFirestore.Transaction, uid: string, selection: ReturnType<typeof exportSelection>, action: string, authorityHash: string) {
  const auditRef = db.collection(`users/${uid}/privacyAudit`).doc()
  transaction.create(auditRef, { ownerId: uid, action, jobId: selection.jobId, file: selection.file, assetId: selection.assetId,
    authorityHash, transport: 'authenticated-function', createdAt: fieldValue.serverTimestamp() })
  return auditRef.id
}
function verifyExportMetadata(metadata: { generation?: unknown; size?: unknown; contentType?: unknown }, authority: Awaited<ReturnType<typeof readDownloadAuthority>>) {
  if (String(metadata.generation) !== authority.generation || Number(metadata.size) !== authority.byteLength || metadata.contentType !== authority.contentType) {
    throw new functions.https.HttpsError('failed-precondition', 'Export object changed.')
  }
}

export const getOperationalExportDownloadUrl = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  requireRecentAuthentication(context)
  const endpoint = exportDownloadEndpoint(context.rawRequest?.get('host'))
  const selection = exportSelection(data ?? {})
  const authority = await db.runTransaction((transaction) => readDownloadAuthority(transaction, uid, selection))
  const [metadata] = await admin.storage().bucket().file(authority.path, { generation: authority.generation }).getMetadata()
  verifyExportMetadata(metadata, authority)
  const downloadExpiresAt = Math.min(Date.now() + EXPORT_EXPIRY_MS, authority.packageExpiresAt,
    authority.canonicalExportConsentExpiresAt, Number(context.auth!.token.auth_time) * 1000 + REAUTH_WINDOW_SECONDS * 1000)
  // This nonce is an issued descriptor identifier, not a standalone credential.
  // Its deadline and exact selection are stored; reconstructing a URL cannot renew it.
  const authorityHash = createHash('sha256').update(`${authority.authorityHash}:${randomBytes(32).toString('hex')}:${downloadExpiresAt}`).digest('hex')
  const auditId = await db.runTransaction(async (transaction) => {
    const current = await readDownloadAuthority(transaction, uid, selection)
    if (current.authorityHash !== authority.authorityHash || !Number.isSafeInteger(downloadExpiresAt) || downloadExpiresAt <= Date.now()) {
      throw new functions.https.HttpsError('failed-precondition', 'Export authority changed.')
    }
    transaction.create(db.doc(`users/${uid}/spatialExportDownloads/${authorityHash}`), {
      ownerId: uid, ...selection, currentAuthorityHash: current.authorityHash, downloadExpiresAt,
      packageExpiresAt: current.packageExpiresAt, createdAt: fieldValue.serverTimestamp(),
    })
    return auditExportDownload(transaction, uid, selection, 'export_download_descriptor_created', authorityHash)
  })
  const params = new URLSearchParams({ jobId: selection.jobId, file: selection.file, expiresAt: String(downloadExpiresAt), authorityHash })
  if (selection.assetId) params.set('assetId', selection.assetId)
  return { schemaVersion: 'urai-spatial-export-download-v1', ...selection, ownerId: uid,
    url: `${endpoint}?${params}`, requiresAuthorization: true, expiresAt: new Date(downloadExpiresAt).toISOString(),
    downloadExpiresAt, packageExpiresAt: authority.packageExpiresAt, checksum: authority.checksum,
    contentType: authority.contentType, byteLength: authority.byteLength, storageGeneration: authority.generation, auditId }
})

async function readIssuedExportDownload(transaction: FirebaseFirestore.Transaction, uid: string,
  selection: ReturnType<typeof exportSelection>, authorityHash: string, expiresAt: number) {
  const [issued, current] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/spatialExportDownloads/${authorityHash}`)),
    readDownloadAuthority(transaction, uid, selection),
  ])
  if (!issued.exists || issued.get('ownerId') !== uid || issued.get('jobId') !== selection.jobId
    || issued.get('file') !== selection.file || issued.get('assetId') !== selection.assetId
    || issued.get('currentAuthorityHash') !== current.authorityHash || issued.get('downloadExpiresAt') !== expiresAt
    || issued.get('packageExpiresAt') !== current.packageExpiresAt || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()
    || expiresAt > Math.min(current.packageExpiresAt, current.canonicalExportConsentExpiresAt)) {
    throw new functions.https.HttpsError('failed-precondition', 'Export authority changed or descriptor expired.')
  }
  return current
}

function allowedExportBrowserOrigin(origin: string, project: string) {
  if (['https://urai.app', 'https://www.urai.app', 'https://urai.life', 'https://uraispatial.com',
    'https://localhost', 'capacitor://localhost', 'http://localhost'].includes(origin)) return true
  if (origin === `https://${project}.web.app` || origin === `https://${project}.firebaseapp.com`) return true
  if (process.env.FUNCTIONS_EMULATOR === 'true' && ['http://localhost:4173', 'http://127.0.0.1:4173'].includes(origin)) return true
  // Only this runtime's governed project preview namespace is admitted.
  return new RegExp(`^https://${project}--[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.web\\.app$`).test(origin)
    && new URL(origin).hostname.split('.')[0].length <= 63
}

// Entry exports this only as downloadOperationalExportPackage. Privacy's canonical
// downloadExportPackage owns its separate root-job schema and is never overwritten.
export const downloadOperationalExportPackage = functions.runWith({ timeoutSeconds: 540, memory: '512MB' }).https.onRequest(async (request, response) => {
  response.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin' })
  try {
    const project = exportProject()
    const origin = request.get('origin')
    if (origin && !allowedExportBrowserOrigin(origin, project)) {
      throw new functions.https.HttpsError('permission-denied', 'Export origin is not admitted.')
    }
    if (request.method === 'OPTIONS') {
      response.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
      const requestedHeaders = request.get('access-control-request-headers')
      if (!origin || request.get('access-control-request-method') !== 'GET' || !requestedHeaders
        || !requestedHeaders.split(',').every(header => header.trim().toLowerCase() === 'authorization')) {
        throw new functions.https.HttpsError('permission-denied', 'Export preflight is not admitted.')
      }
      response.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Authorization', 'Access-Control-Max-Age': '0' }).status(204).end()
      return
    }
    if (origin) response.set({ 'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, Content-Length, X-URAI-Checksum-SHA256, X-URAI-Storage-Generation' })
    if (request.method !== 'GET') { response.set('Allow', 'GET, OPTIONS').status(405).json({ error: 'method_not_allowed' }); return }
    const bearer = request.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!bearer) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
    let token: admin.auth.DecodedIdToken
    try { token = await admin.auth().verifyIdToken(bearer, true) }
    catch { throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.') }
    requireRecentAuthentication({ auth: { uid: token.uid, token } } as functions.https.CallableContext)
    const requireCurrentDownloadAuthentication = async () => {
      let currentToken: admin.auth.DecodedIdToken
      try { currentToken = await admin.auth().verifyIdToken(bearer, true) }
      catch { throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.') }
      if (currentToken.uid !== token.uid) throw new functions.https.HttpsError('permission-denied', 'Authenticated export owner changed.')
      if (request.aborted || response.destroyed) throw new functions.https.HttpsError('unauthenticated', 'Download connection changed.')
      requireRecentAuthentication({ auth: { uid: currentToken.uid, token: currentToken } } as functions.https.CallableContext)
    }
    const selection = exportSelection(request.query as JsonMap)
    const expiresAt = typeof request.query.expiresAt === 'string' && /^[1-9][0-9]{0,15}$/.test(request.query.expiresAt)
      ? Number(request.query.expiresAt) : Number.NaN
    const authorityHash = request.query.authorityHash
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || typeof authorityHash !== 'string' || !/^[a-f0-9]{64}$/.test(authorityHash)) {
      throw new functions.https.HttpsError('failed-precondition', 'Export descriptor expired.')
    }
    const authority = await db.runTransaction((transaction) => readIssuedExportDownload(transaction, token.uid, selection, authorityHash, expiresAt))
    await requireCurrentDownloadAuthentication()
    const object = admin.storage().bucket().file(authority.path, { generation: authority.generation })
    const [metadata] = await object.getMetadata()
    await requireCurrentDownloadAuthentication()
    verifyExportMetadata(metadata, authority)
    await db.runTransaction(async (transaction) => {
      await readIssuedExportDownload(transaction, token.uid, selection, authorityHash, expiresAt)
      auditExportDownload(transaction, token.uid, selection, 'export_download_authorized', authorityHash)
    })
    await requireCurrentDownloadAuthentication()
    response.set({ 'Content-Type': authority.contentType, 'Content-Length': String(authority.byteLength),
      'X-URAI-Checksum-SHA256': authority.checksum, 'X-URAI-Storage-Generation': authority.generation,
      'Content-Disposition': `attachment; filename="urai-${selection.file}.${selection.file === 'runtime' ? 'splat' : 'json'}"` })
    const stream = object.createReadStream()
    response.once('close', () => { if (!response.writableFinished) stream.destroy() })
    let deliveredBytes = 0
    const digest = createHash('sha256')
    const requireCurrent = async () => {
      await requireCurrentDownloadAuthentication()
      await db.runTransaction((transaction) => readIssuedExportDownload(transaction, token.uid, selection, authorityHash, expiresAt))
      // The transaction and metadata awaits can outlive a token grant. Check
      // revocation, the same owner and recent auth again immediately before bytes.
      await requireCurrentDownloadAuthentication()
    }
    const guardedChunks = async function* (source: AsyncIterable<Buffer>) {
      for await (const incoming of source) {
        const chunk = Buffer.isBuffer(incoming) ? incoming : Buffer.from(incoming)
        for (let offset = 0; offset < chunk.length; offset += 64 * 1024) {
          await requireCurrent()
          const bytes = chunk.subarray(offset, offset + 64 * 1024)
          deliveredBytes += bytes.length
          if (!Number.isSafeInteger(deliveredBytes) || deliveredBytes > authority.byteLength) throw new functions.https.HttpsError('failed-precondition', 'Export length changed.')
          digest.update(bytes)
          yield bytes
        }
      }
      await requireCurrent()
      if (deliveredBytes !== authority.byteLength || digest.digest('hex') !== authority.checksum) throw new functions.https.HttpsError('failed-precondition', 'Export checksum changed.')
    }
    await pipeline(stream, guardedChunks, response)
  } catch (error) {
    if (response.headersSent || response.destroyed) return
    const status = error instanceof functions.https.HttpsError
      ? ({ unauthenticated: 401, 'permission-denied': 403, 'not-found': 404, 'invalid-argument': 400, 'failed-precondition': 409 } as Record<string, number>)[error.code] ?? 500 : 500
    response.status(status).json({ error: 'export_download_unavailable' })
  }
})

export const cancelExportRequest = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const jobId = requireString(data?.jobId, 'jobId', 80)
  const jobRef = db.doc(`users/${uid}/exportJobs/${jobId}`)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef)
    if (!snapshot.exists || snapshot.get('uid') !== uid) {
      throw new functions.https.HttpsError('not-found', 'Export request was not found.')
    }
    const state = String(snapshot.get('state'))
    if (!['queued', 'preparing'].includes(state)) {
      throw new functions.https.HttpsError('failed-precondition', 'Export can no longer be cancelled.')
    }
    transaction.update(jobRef, { state: 'cancelled', cancelledAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() })
  })
  return { jobId, state: 'cancelled' }
})

function parseDeletionScope(value: unknown): DeletionScope {
  const scope = String(value ?? '') as DeletionScope
  if (!DELETION_SCOPES.includes(scope)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown deletion scope.')
  }
  return scope
}

function deletionConfirmation(scope: DeletionScope): string {
  if (scope === 'account') return 'DELETE MY URAI ACCOUNT'
  if (scope === 'all-repository-data') return 'DELETE MY URAI DATA'
  return 'CONFIRM DELETE'
}

export const createDeletionRequest = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  requireRecentAuthentication(context)
  const operationId = requireOperationId(data?.operationId)
  const scope = parseDeletionScope(data?.scope)
  const confirmation = requireString(data?.confirmation, 'confirmation', 64)
  if (confirmation !== deletionConfirmation(scope)) {
    throw new functions.https.HttpsError('invalid-argument', 'Deletion confirmation did not match.')
  }
  const reason = typeof data?.reason === 'string' ? data.reason.trim().slice(0, 240) : ''
  const jobId = stableId(uid, operationId, 'deletion')
  const receiptId = stableId(uid, operationId, 'deletion-receipt')
  const jobRef = db.doc(`users/${uid}/deletionJobs/${jobId}`)
  const queueRef = db.doc(`deletionQueue/${jobId}`)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${receiptId}`)
  const existing = await jobRef.get()
  if (existing.exists) return publicJobState(existing.data() as JsonMap)
  const executeAfter = scope === 'account'
    ? timestamp.fromMillis(Date.now() + ACCOUNT_GRACE_MS)
    : timestamp.fromMillis(Date.now())
  const initialState = scope === 'account' ? 'awaiting-grace' : 'queued'
  const now = fieldValue.serverTimestamp()
  const record = {
    jobId,
    uid,
    scope,
    state: initialState,
    reason,
    receiptId,
    executeAfter,
    retainedExceptions: [
      'append-only deletion receipt',
      'security and fraud records required for service integrity',
      'records a provider or law requires URAI to retain',
    ],
    createdAt: now,
    updatedAt: now,
  }
  await db.runTransaction(async (transaction) => {
    const [existingJob, fence] = await Promise.all([transaction.get(jobRef), transaction.get(exportFenceRef(uid))])
    if (existingJob.exists) return
    const generation = fence.exists ? fence.get('generation') : 0
    if (!Number.isSafeInteger(generation) || generation < 0 || generation >= Number.MAX_SAFE_INTEGER
      || (fence.exists && !isRecord(fence.get('pendingDeletions')))) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid export deletion epoch.')
    }
    const pending = isRecord(fence.get('pendingDeletions')) ? fence.get('pendingDeletions') as JsonMap : {}
    transaction.create(jobRef, record)
    transaction.create(queueRef, record)
    transaction.create(receiptRef, { receiptId, ownerId: uid, kind: 'deletion', jobId, scope, result: initialState,
      retainedExceptions: record.retainedExceptions, createdAt: now, updatedAt: now })
    transaction.set(exportFenceRef(uid), { generation: generation + 1, pendingDeletions: { ...pending, [jobId]: true }, updatedAt: now })
  })
  return { jobId, state: initialState, receiptId, executeAfter: executeAfter.toDate().toISOString() }
})

const DELETION_COLLECTIONS: Record<Exclude<DeletionScope, 'account'>, string[]> = {
  'export-history': ['exportJobs', 'spatialExportDownloads'],
  'privacy-history': ['privacyAudit'],
  memories: ['memories', 'replayEvents', 'spatialMemories', 'canonChains'],
  'life-model': [
    'lifeEntities',
    'lifeEntityStates',
    'lifeClaims',
    'lifeRelationships',
    'lifeEvents',
    'lifeCausalEdges',
    'lifeGraphSnapshots',
    'lifeCorrections',
    'lifeConflicts',
    'knowledgeGaps',
    'personModelBundles',
    'personRenderBindings',
    'sceneTruthPackets',
    'renderManifests',
    'simulationSessions',
    'lifeModelReceipts',
    'privateLifeModelSources',
    'privateLifeModelTranscripts',
    'privateLifeModelProvenance',
  ],
  intelligence: ['scenarios', 'aiLedger'],
  'spatial-state': [
    'homeWorld',
    'homeWorldExplainability',
    'focusStates',
    'transitionStates',
    'bodyBiometricSnapshots',
    'orbCompanionEvents',
    'spatialAnchors',
    'userSpatialPreferences',
    'spatialSessions',
    'behaviorSignals',
    'voiceEvents',
    'locations',
    'capturedRealityAssets',
    'capturedRealityReplayBindings',
  ],
  'all-repository-data': [
    'exportJobs',
    'spatialExportDownloads',
    'privacyAudit',
    'privacyPolicy',
    'privacyRuntime',
    'memories',
    'replayEvents',
    'spatialMemories',
    'canonChains',
    'homeWorld',
    'homeWorldExplainability',
    'focusStates',
    'transitionStates',
    'bodyBiometricSnapshots',
    'orbCompanionEvents',
    'spatialAnchors',
    'userSpatialPreferences',
    'spatialSessions',
    'behaviorSignals',
    'voiceEvents',
    'locations',
    'capturedRealityAssets',
    'capturedRealityReplayBindings',
    'providerConnections',
    'scenarios',
    'aiLedger',
    'lifeEntities',
    'lifeEntityStates',
    'lifeClaims',
    'lifeRelationships',
    'lifeEvents',
    'lifeCausalEdges',
    'lifeGraphSnapshots',
    'lifeCorrections',
    'lifeConflicts',
    'knowledgeGaps',
    'personModelBundles',
    'personRenderBindings',
    'sceneTruthPackets',
    'renderManifests',
    'simulationSessions',
    'lifeModelReceipts',
    'privateLifeModelSources',
    'privateLifeModelTranscripts',
    'privateLifeModelProvenance',
  ],
}

async function deleteCapturedRealityStorage(uid: string, options: { deleteAllExports?: boolean; deleteSource?: boolean } = {}) {
  const bucket = admin.storage().bucket()
  if (options.deleteSource !== false) {
    await bucket.deleteFiles({ prefix: `private-captured-reality/${uid}/` })
  }

  const exportPrefix = `private-exports/${uid}/`
  if (options.deleteAllExports) {
    await bucket.deleteFiles({ prefix: exportPrefix })
    return
  }

  const [exportFiles] = await bucket.getFiles({ prefix: exportPrefix })
  const capturedRealityExports = exportFiles.filter((file) => file.name.includes('/spatial/captured-reality/'))
  await Promise.all(capturedRealityExports.map((file) => file.delete({ ignoreNotFound: true })))
}

async function finishExportDeletionFence(uid: string, jobId: string) {
  await db.runTransaction(async (transaction) => {
    const fence = await transaction.get(exportFenceRef(uid))
    if (!fence.exists) return
    if (!isRecord(fence.get('pendingDeletions'))) throw new functions.https.HttpsError('failed-precondition', 'Invalid export deletion epoch.')
    const pending = { ...fence.get('pendingDeletions') as JsonMap }
    delete pending[jobId]
    transaction.update(exportFenceRef(uid), { pendingDeletions: pending, updatedAt: fieldValue.serverTimestamp() })
  })
}

async function processDeletion(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const job = snapshot.data() as JsonMap | undefined
  if (!job || typeof job.uid !== 'string') return
  const scope = parseDeletionScope(job.scope)
  const state = String(job.state)
  if (['completed', 'failed', 'cancelled'].includes(state)) return
  const executeAfter = job.executeAfter as admin.firestore.Timestamp | undefined
  if (executeAfter && executeAfter.toMillis() > Date.now()) return

  const uid = job.uid
  const userJobRef = db.doc(`users/${uid}/deletionJobs/${snapshot.id}`)
  const receiptId = String(job.receiptId)
  const userReceiptRef = db.doc(`users/${uid}/privacyReceipts/${receiptId}`)
  const durableReceiptRef = db.doc(`deletionReceipts/${receiptId}`)
  try {
    const claimed = await db.runTransaction(async (transaction) => {
      const [current, ownerJob, fence] = await Promise.all([
        transaction.get(snapshot.ref), transaction.get(userJobRef), transaction.get(exportFenceRef(uid)),
      ])
      if (!current.exists || current.get('uid') !== uid || !ownerJob.exists || ownerJob.get('uid') !== uid
        || !['queued', 'awaiting-grace'].includes(String(current.get('state')))
        || current.get('state') !== ownerJob.get('state')) return false
      const deadline = current.get('executeAfter')
      if (!(deadline instanceof admin.firestore.Timestamp) || !Number.isSafeInteger(deadline.toMillis()) || deadline.toMillis() > Date.now()) return false
      const generation = fence.exists ? fence.get('generation') : 0
      if (!Number.isSafeInteger(generation) || generation < 0 || generation >= Number.MAX_SAFE_INTEGER
        || (fence.exists && !isRecord(fence.get('pendingDeletions')))) throw new functions.https.HttpsError('failed-precondition', 'Invalid export deletion epoch.')
      const pending = isRecord(fence.get('pendingDeletions')) ? { ...fence.get('pendingDeletions') as JsonMap } : {}
      const alreadyPending = Object.prototype.hasOwnProperty.call(pending, snapshot.id)
      pending[snapshot.id] = true
      transaction.set(exportFenceRef(uid), { generation: generation + (alreadyPending ? 0 : 1), pendingDeletions: pending, updatedAt: fieldValue.serverTimestamp() })
      transaction.update(snapshot.ref, { state: 'in-progress', startedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() })
      transaction.update(userJobRef, { state: 'in-progress', startedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() })
      return true
    })
    // An onCreate snapshot can outlive a cancellation. Current queue and owner
    // state must be atomically claimed before the first destructive operation.
    if (!claimed) return
    const userRef = db.doc(`users/${uid}`)
    const deletedCollections: string[] = []
    if (scope === 'account' || scope === 'all-repository-data' || scope === 'life-model') {
      await tombstonePrivateLifeModelInputs(db, uid, fieldValue.serverTimestamp())
    }
    if (scope === 'account') {
      await deleteCapturedRealityStorage(uid, { deleteAllExports: true })
      await db.recursiveDelete(userRef)
      await admin.auth().deleteUser(uid)
    } else {
      if (scope === 'spatial-state') {
        await deleteCapturedRealityStorage(uid)
      } else if (scope === 'all-repository-data') {
        await deleteCapturedRealityStorage(uid, { deleteAllExports: true })
      } else if (scope === 'export-history') {
        await deleteCapturedRealityStorage(uid, { deleteAllExports: true, deleteSource: false })
      }
      for (const collectionName of DELETION_COLLECTIONS[scope]) {
        await db.recursiveDelete(userRef.collection(collectionName))
        deletedCollections.push(collectionName)
      }
    }
    const finalReceipt = {
      receiptId,
      ownerDigest: ownerDigest(uid),
      kind: 'deletion',
      scope,
      result: 'completed',
      deletedCollections,
      retainedExceptions: Array.isArray(job.retainedExceptions) ? job.retainedExceptions : [],
      completedAt: fieldValue.serverTimestamp(),
      createdAt: fieldValue.serverTimestamp(),
    }
    await durableReceiptRef.set(finalReceipt)
    if (scope !== 'account') {
      await Promise.all([
        snapshot.ref.update({ state: 'completed', deletedCollections, completedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }),
        userJobRef.set({ state: 'completed', deletedCollections, completedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
        userReceiptRef.set({ result: 'completed', deletedCollections, completedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
      ])
      await finishExportDeletionFence(uid, snapshot.id)
    } else {
      await snapshot.ref.delete()
    }
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 240) : 'UNKNOWN_DELETION_FAILURE'
    await Promise.all([
      snapshot.ref.set({ state: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
      userJobRef.set({ state: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
      userReceiptRef.set({ result: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
    ])
    throw error
  }
}

export const processDeletionQueueItem = functions.firestore
  .document('deletionQueue/{jobId}')
  .onCreate(async (snapshot) => processDeletion(snapshot))

export const processDeletionGraceQueue = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const snapshot = await db.collection('deletionQueue').where('state', '==', 'awaiting-grace').limit(25).get()
    for (const item of snapshot.docs) {
      const executeAfter = item.get('executeAfter') as admin.firestore.Timestamp | undefined
      if (executeAfter && executeAfter.toMillis() <= Date.now()) await processDeletion(item)
    }
  })

export const cancelDeletionRequest = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const jobId = requireString(data?.jobId, 'jobId', 80)
  const jobRef = db.doc(`users/${uid}/deletionJobs/${jobId}`)
  const queueRef = db.doc(`deletionQueue/${jobId}`)
  await db.runTransaction(async (transaction) => {
    const job = await transaction.get(jobRef)
    if (!job.exists || job.get('uid') !== uid) {
      throw new functions.https.HttpsError('not-found', 'Deletion request was not found.')
    }
    if (!['queued', 'awaiting-grace'].includes(String(job.get('state')))) {
      throw new functions.https.HttpsError('failed-precondition', 'Deletion can no longer be cancelled.')
    }
    transaction.update(jobRef, { state: 'cancelled', cancelledAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() })
    transaction.set(queueRef, { state: 'cancelled', cancelledAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }, { merge: true })
  })
  await finishExportDeletionFence(uid, jobId)
  return { jobId, state: 'cancelled' }
})

function safeTimestamp(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

function safeRows(snapshot: FirebaseFirestore.QuerySnapshot, kind: string) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    kind,
    label: String(item.get('label') ?? item.get('provider') ?? item.get('sourceType') ?? kind),
    status: String(item.get('status') ?? item.get('state') ?? 'unknown'),
    sourceType: String(item.get('sourceType') ?? item.get('channel') ?? kind),
    permission: String(item.get('permission') ?? item.get('mode') ?? 'unknown'),
    firstSeen: safeTimestamp(item.get('firstSeen') ?? item.get('createdAt')),
    lastUpdated: safeTimestamp(item.get('lastUpdated') ?? item.get('updatedAt')),
    provenance: String(item.get('provenance') ?? 'partial'),
    contributesTo: Array.isArray(item.get('contributesTo'))
      ? item.get('contributesTo').filter((value: unknown): value is string => typeof value === 'string').slice(0, 12)
      : [],
  }))
}

export const getPassportSnapshot = functions.https.onCall(async (_data, context) => {
  const uid = requireUid(context)
  const userRef = db.doc(`users/${uid}`)
  const [user, policy, sources, devices, providers, exports, deletions, receipts] = await Promise.all([
    userRef.get(),
    userRef.collection('privacyPolicy').doc('current').get(),
    userRef.collection('dataSources').limit(100).get(),
    userRef.collection('devices').limit(100).get(),
    userRef.collection('providerConnections').limit(100).get(),
    userRef.collection('exportJobs').orderBy('createdAt', 'desc').limit(25).get(),
    userRef.collection('deletionJobs').orderBy('createdAt', 'desc').limit(25).get(),
    userRef.collection('privacyReceipts').orderBy('createdAt', 'desc').limit(50).get(),
  ])
  const claims = (context.auth?.token ?? {}) as Record<string, unknown>
  const authTime = Number(claims.auth_time ?? 0)
  const keyState = Math.floor(Date.now() / 1000) - authTime <= REAUTH_WINDOW_SECONDS ? 'authorized' : 'available'
  const displayName = String(user.get('displayName') ?? context.auth?.token.name ?? 'Private owner').slice(0, 120)
  const consentPolicy = policy.exists ? parseStoredPolicy(policy.data(), uid) : defaultPolicy(uid)
  return {
    schema: 'urai-passport-snapshot-v1',
    owner: {
      displayName,
      ownershipStatus: user.exists ? 'verified' : 'limited',
      keyState,
      ownerReference: ownerDigest(uid).slice(0, 12),
    },
    consent: {
      revision: consentPolicy.revision,
      enforcement: consentPolicy.enforcement,
      domains: consentPolicy.domains,
    },
    sources: safeRows(sources, 'source'),
    devices: safeRows(devices, 'device'),
    providers: safeRows(providers, 'provider'),
    exports: exports.docs.map((item) => ({
      id: item.id,
      state: String(item.get('state') ?? 'unknown'),
      scopes: Array.isArray(item.get('scopes')) ? item.get('scopes') : [],
      checksum: typeof item.get('checksum') === 'string' ? item.get('checksum') : null,
      createdAt: safeTimestamp(item.get('createdAt')),
      expiresAt: safeTimestamp(item.get('expiresAt')),
    })),
    deletions: deletions.docs.map((item) => ({
      id: item.id,
      state: String(item.get('state') ?? 'unknown'),
      scope: String(item.get('scope') ?? 'unknown'),
      createdAt: safeTimestamp(item.get('createdAt')),
      executeAfter: safeTimestamp(item.get('executeAfter')),
    })),
    receipts: receipts.docs.map((item) => ({
      id: item.id,
      kind: String(item.get('kind') ?? 'unknown'),
      result: String(item.get('result') ?? 'unknown'),
      summary: String(item.get('summary') ?? `${String(item.get('kind') ?? 'Privacy')} operation ${String(item.get('result') ?? 'recorded')}`).slice(0, 240),
      createdAt: safeTimestamp(item.get('createdAt')),
    })),
    recovery: {
      status: String(user.get('recoveryStatus') ?? 'clear'),
      supportAvailable: true,
    },
  }
})

