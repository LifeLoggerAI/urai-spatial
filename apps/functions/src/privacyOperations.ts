import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const fieldValue = admin.firestore.FieldValue
const timestamp = admin.firestore.Timestamp

const CONSENT_DOMAINS = ['memory', 'location', 'models', 'exports', 'workforce', 'identity'] as const
const CONSENT_MODES = ['granted', 'limited', 'paused', 'denied'] as const
const EXPORT_SCOPES = ['profile', 'consent', 'memories', 'spatial', 'audit'] as const
const DELETION_SCOPES = [
  'export-history',
  'privacy-history',
  'memories',
  'spatial-state',
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
const MAX_EXPORT_DOCUMENTS_PER_COLLECTION = 500

function requireUid(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireRecentAuthentication(context: functions.https.CallableContext) {
  requireUid(context)
  const authTime = Number(context.auth?.token.auth_time ?? 0)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(authTime) || authTime <= 0 || now - authTime > REAUTH_WINDOW_SECONDS) {
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
    if (/token|secret|password|api.?key|credential|privateMediaUrl|rawAudioUrl/i.test(key)) continue
    output[key] = redactSecrets(item)
  }
  return output
}

async function collectionDocuments(ref: FirebaseFirestore.CollectionReference) {
  const snapshot = await ref.limit(MAX_EXPORT_DOCUMENTS_PER_COLLECTION).get()
  return snapshot.docs.map((item) => ({ id: item.id, ...redactSecrets(item.data()) as JsonMap }))
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
  const existing = await jobRef.get()
  if (existing.exists) return publicJobState(existing.data() as JsonMap)
  const now = fieldValue.serverTimestamp()
  const batch = db.batch()
  batch.create(jobRef, {
    jobId,
    uid,
    scopes,
    state: 'queued',
    progress: 0,
    receiptId,
    createdAt: now,
    updatedAt: now,
  })
  batch.create(receiptRef, {
    receiptId,
    ownerId: uid,
    kind: 'export',
    jobId,
    scopes,
    result: 'queued',
    createdAt: now,
    updatedAt: now,
  })
  await batch.commit()
  return { jobId, state: 'queued', receiptId }
})

async function buildExport(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const job = snapshot.data() as JsonMap | undefined
  if (!job || typeof job.uid !== 'string' || !Array.isArray(job.scopes)) return
  if (String(job.state) !== 'queued') return
  const uid = job.uid
  const scopes = parseExportScopes(job.scopes)
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${String(job.receiptId)}`)
  try {
    await snapshot.ref.update({ state: 'preparing', progress: 10, updatedAt: fieldValue.serverTimestamp() })
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
    if (scopes.includes('profile')) {
      const profile = await userRef.get()
      data.profile = profile.exists ? redactSecrets(profile.data()) : null
    }
    if (scopes.includes('consent')) {
      data.privacyPolicy = await collectionDocuments(userRef.collection('privacyPolicy'))
      data.privacyRuntime = await collectionDocuments(userRef.collection('privacyRuntime'))
    }
    if (scopes.includes('memories')) {
      data.replayEvents = await collectionDocuments(userRef.collection('replayEvents'))
      data.spatialMemories = await collectionDocuments(userRef.collection('spatialMemories'))
    }
    if (scopes.includes('spatial')) {
      data.homeWorld = await collectionDocuments(userRef.collection('homeWorld'))
      data.focusStates = await collectionDocuments(userRef.collection('focusStates'))
      data.transitionStates = await collectionDocuments(userRef.collection('transitionStates'))
      data.spatialAnchors = await collectionDocuments(userRef.collection('spatialAnchors'))
    }
    if (scopes.includes('audit')) {
      data.receipts = await collectionDocuments(userRef.collection('privacyReceipts'))
    }

    const json = JSON.stringify(payload, null, 2)
    const checksum = createHash('sha256').update(json).digest('hex')
    const manifest = JSON.stringify({
      schema: 'urai-user-export-manifest-v1',
      jobId: snapshot.id,
      checksumAlgorithm: 'sha256',
      checksum,
      scopes,
      createdAt: new Date().toISOString(),
    }, null, 2)
    const bucket = admin.storage().bucket()
    const basePath = `private-exports/${uid}/${snapshot.id}`
    await Promise.all([
      bucket.file(`${basePath}/export.json`).save(Buffer.from(json), {
        resumable: false,
        contentType: 'application/json',
        metadata: { metadata: { ownerUid: uid, jobId: snapshot.id, checksum } },
      }),
      bucket.file(`${basePath}/manifest.json`).save(Buffer.from(manifest), {
        resumable: false,
        contentType: 'application/json',
        metadata: { metadata: { ownerUid: uid, jobId: snapshot.id, checksum } },
      }),
    ])
    const expiresAt = timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await Promise.all([
      snapshot.ref.update({
        state: 'ready',
        progress: 100,
        checksum,
        checksumAlgorithm: 'sha256',
        exportObject: `${basePath}/export.json`,
        manifestObject: `${basePath}/manifest.json`,
        expiresAt,
        completedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      }),
      receiptRef.update({
        result: 'ready',
        checksum,
        checksumAlgorithm: 'sha256',
        expiresAt,
        completedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      }),
    ])
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 240) : 'UNKNOWN_EXPORT_FAILURE'
    await Promise.all([
      snapshot.ref.set({ state: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
      receiptRef.set({ result: 'failed', failureCode: failure, updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
    ])
    throw error
  }
}

export const processExportJob = functions.firestore
  .document('users/{uid}/exportJobs/{jobId}')
  .onCreate(async (snapshot) => buildExport(snapshot))

export const getExportDownloadUrl = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  requireRecentAuthentication(context)
  const jobId = requireString(data?.jobId, 'jobId', 80)
  const file = data?.file === 'manifest' ? 'manifest' : 'export'
  const job = await db.doc(`users/${uid}/exportJobs/${jobId}`).get()
  if (!job.exists || job.get('uid') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Export request was not found.')
  }
  if (job.get('state') !== 'ready') {
    throw new functions.https.HttpsError('failed-precondition', 'Export is not ready.')
  }
  const expiresAt = job.get('expiresAt') as admin.firestore.Timestamp | undefined
  if (expiresAt && expiresAt.toMillis() <= Date.now()) {
    await job.ref.update({ state: 'expired', updatedAt: fieldValue.serverTimestamp() })
    throw new functions.https.HttpsError('failed-precondition', 'Export has expired.')
  }
  const objectPath = String(job.get(file === 'manifest' ? 'manifestObject' : 'exportObject') ?? '')
  if (!objectPath.startsWith(`private-exports/${uid}/${jobId}/`)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid export object boundary.')
  }
  const [url] = await admin.storage().bucket().file(objectPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + EXPORT_EXPIRY_MS,
  })
  return {
    jobId,
    file,
    url,
    expiresAt: new Date(Date.now() + EXPORT_EXPIRY_MS).toISOString(),
    checksum: job.get('checksum') ?? null,
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
  const batch = db.batch()
  batch.create(jobRef, record)
  batch.create(queueRef, record)
  batch.create(receiptRef, {
    receiptId,
    ownerId: uid,
    kind: 'deletion',
    jobId,
    scope,
    result: initialState,
    retainedExceptions: record.retainedExceptions,
    createdAt: now,
    updatedAt: now,
  })
  await batch.commit()
  return { jobId, state: initialState, receiptId, executeAfter: executeAfter.toDate().toISOString() }
})

const DELETION_COLLECTIONS: Record<Exclude<DeletionScope, 'account'>, string[]> = {
  'export-history': ['exportJobs'],
  'privacy-history': ['privacyAudit'],
  memories: ['replayEvents', 'spatialMemories', 'canonChains'],
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
  ],
  'all-repository-data': [
    'exportJobs',
    'privacyAudit',
    'privacyPolicy',
    'privacyRuntime',
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
    'providerConnections',
  ],
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
    await Promise.all([
      snapshot.ref.update({ state: 'in-progress', startedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }),
      userJobRef.set({ state: 'in-progress', startedAt: fieldValue.serverTimestamp(), updatedAt: fieldValue.serverTimestamp() }, { merge: true }),
    ])
    const userRef = db.doc(`users/${uid}`)
    const deletedCollections: string[] = []
    if (scope === 'account') {
      await db.recursiveDelete(userRef)
      await admin.auth().deleteUser(uid)
    } else {
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
