import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const passiveSignalsFunctions = functions.region('us-central1')

const SIGNAL_TYPES = [
  'session-activity',
  'stillness',
  'late-night',
  'quick-cancel',
  'motion',
  'location',
  'ambient-tag',
  'steps',
  'voice-interaction',
  'camera-emotion',
] as const

type SignalType = typeof SIGNAL_TYPES[number]
type JsonMap = Record<string, unknown>

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function signalType(value: unknown): SignalType {
  const next = String(value ?? '') as SignalType
  if (!SIGNAL_TYPES.includes(next)) throw new functions.https.HttpsError('invalid-argument', 'Unsupported passive signal type.')
  return next
}

function cleanString(value: unknown, max = 160) {
  if (typeof value !== 'string') return undefined
  const next = value.trim().slice(0, max)
  return next || undefined
}

function finiteNumber(value: unknown, min: number, max: number) {
  const next = Number(value)
  return Number.isFinite(next) && next >= min && next <= max ? next : undefined
}

function enabledDomain(value: unknown) {
  if (!isRecord(value)) return false
  const mode = String(value.mode ?? 'denied')
  return (mode === 'granted' || mode === 'limited')
}

async function requireSignalConsent(uid: string, type: SignalType, transaction: admin.firestore.Transaction) {
  const policy = await transaction.get(db.doc(`users/${uid}/privacyPolicy/current`))
  if (!policy.exists) throw new functions.https.HttpsError('permission-denied', 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED')

  const domains = isRecord(policy.get('domains')) ? policy.get('domains') as JsonMap : {}
  const workforce = isRecord(domains.workforce) ? domains.workforce as JsonMap : {}
  if (!enabledDomain(workforce) || workforce.automationEnabled !== true) {
    throw new functions.https.HttpsError('permission-denied', 'PASSIVE_SIGNAL_AUTOMATION_CONSENT_REQUIRED')
  }

  if (type === 'location') {
    const location = isRecord(domains.location) ? domains.location as JsonMap : {}
    if (!enabledDomain(location)) throw new functions.https.HttpsError('permission-denied', 'PASSIVE_SIGNAL_LOCATION_CONSENT_REQUIRED')
  }

  if (type === 'voice-interaction') {
    const models = isRecord(domains.models) ? domains.models as JsonMap : {}
    if (!enabledDomain(models) || models.modelContext !== true) {
      throw new functions.https.HttpsError('permission-denied', 'PASSIVE_SIGNAL_MODEL_CONTEXT_CONSENT_REQUIRED')
    }
  }

  if (type === 'camera-emotion') {
    const identity = isRecord(domains.identity) ? domains.identity as JsonMap : {}
    if (!enabledDomain(identity) || identity.likenessEnabled !== true) {
      throw new functions.https.HttpsError('permission-denied', 'PASSIVE_SIGNAL_LIKENESS_CONSENT_REQUIRED')
    }
  }

  return domains
}

function normalizedSignal(type: SignalType, payload: unknown) {
  const input = isRecord(payload) ? payload : {}
  const base: JsonMap = {
    source: cleanString(input.source, 48) ?? 'browser',
    label: cleanString(input.label, 120),
    confidence: finiteNumber(input.confidence, 0, 1),
  }

  if (type === 'session-activity') {
    return { ...base, activity: cleanString(input.activity, 48), durationMs: finiteNumber(input.durationMs, 0, 86_400_000) }
  }
  if (type === 'stillness') {
    return { ...base, durationMs: finiteNumber(input.durationMs, 5_000, 86_400_000) }
  }
  if (type === 'late-night') {
    return { ...base, localHour: finiteNumber(input.localHour, 0, 23), timezoneOffsetMinutes: finiteNumber(input.timezoneOffsetMinutes, -840, 840) }
  }
  if (type === 'quick-cancel') {
    return { ...base, count: finiteNumber(input.count, 1, 12), windowMs: finiteNumber(input.windowMs, 100, 30_000) }
  }
  if (type === 'motion') {
    return {
      ...base,
      intensity: finiteNumber(input.intensity, 0, 1000),
      sampleWindowMs: finiteNumber(input.sampleWindowMs, 100, 60_000),
      deviceMotion: input.deviceMotion === true,
    }
  }
  if (type === 'location') {
    return {
      ...base,
      precision: input.precision === 'precise' ? 'precise' : 'approximate',
      latitude: finiteNumber(input.latitude, -90, 90),
      longitude: finiteNumber(input.longitude, -180, 180),
      accuracyMeters: finiteNumber(input.accuracyMeters, 0, 100_000),
    }
  }
  if (type === 'ambient-tag') {
    return { ...base, tags: Array.isArray(input.tags) ? input.tags.map((tag) => cleanString(tag, 48)).filter(Boolean).slice(0, 12) : [] }
  }
  if (type === 'steps') {
    return { ...base, steps: finiteNumber(input.steps, 0, 250_000), intervalMinutes: finiteNumber(input.intervalMinutes, 1, 1_440) }
  }
  if (type === 'voice-interaction') {
    return {
      ...base,
      transcript: cleanString(input.transcript, 1_200),
      toneTag: cleanString(input.toneTag, 48),
      durationMs: finiteNumber(input.durationMs, 0, 3_600_000),
      rawAudioStored: false,
    }
  }
  return {
    ...base,
    emotionTag: cleanString(input.emotionTag, 48),
    colorTag: cleanString(input.colorTag, 48),
    rawImageStored: false,
  }
}

function compact(value: JsonMap) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

export const recordPassiveSignal = passiveSignalsFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const type = signalType(data?.type)

  const collectionName = type === 'voice-interaction'
    ? 'voiceEvents'
    : type === 'location'
      ? 'locations'
      : 'behaviorSignals'

  const ref = db.collection(`users/${uid}/${collectionName}`).doc()
  // The policy read and signal write share one transaction. A conflicting policy
  // change retries validation and minimization before any signal is committed.
  return db.runTransaction(async (transaction) => {
    const domains = await requireSignalConsent(uid, type, transaction)
    const payload = compact(normalizedSignal(type, data?.payload))

    if (type === 'location') {
      const location = isRecord(domains.location) ? domains.location as JsonMap : {}
      const preciseAllowed = location.precise === true
      // Client labels do not grant permission to retain precise coordinates.
      if (!preciseAllowed) {
        payload.precision = 'approximate'
        const latitude = typeof payload.latitude === 'number' ? payload.latitude : undefined
        const longitude = typeof payload.longitude === 'number' ? payload.longitude : undefined
        payload.latitude = latitude === undefined ? undefined : Math.round(latitude * 100) / 100
        payload.longitude = longitude === undefined ? undefined : Math.round(longitude * 100) / 100
        payload.accuracyMeters = Math.max(Number(payload.accuracyMeters ?? 0), 1_000)
      }
    }

    transaction.set(ref, {
      signalId: ref.id,
      ownerId: uid,
      type,
      payload: compact(payload),
      privacyClass: type === 'voice-interaction' || type === 'camera-emotion' ? 'sensitive' : 'private',
      rawMediaStored: false,
      source: 'consented-passive-runtime-v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { accepted: true, signalId: ref.id, type, rawMediaStored: false }
  })
})
