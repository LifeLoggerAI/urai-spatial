import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'us-central1'
const ELEVATION_API_KEY = defineSecret('URAI_ELEVATION_SERVER_CREDENTIAL')
const db = admin.firestore()
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 12

type JsonMap = Record<string, unknown>

class ElevationError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
    this.name = 'ElevationError'
  }
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

async function consumeElevationRateLimit(uid: string) {
  const ref = db.doc(`users/${uid}/providerRateLimits/maps-elevation`)
  const now = Date.now()
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() ?? {}
    const prior = data.windowStartedAt instanceof admin.firestore.Timestamp ? data.windowStartedAt.toMillis() : 0
    const active = prior > 0 && now - prior < RATE_WINDOW_MS
    const count = active ? Number(data.count ?? 0) : 0
    if (count >= RATE_LIMIT_MAX) throw new ElevationError(429, 'rate_limited')
    transaction.set(ref, {
      provider: 'maps-elevation',
      count: count + 1,
      windowStartedAt: admin.firestore.Timestamp.fromMillis(active ? prior : now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })
}

async function authenticatedUid(request: { headers: { authorization?: string } }) {
  const header = String(request.headers.authorization ?? '')
  if (!header.startsWith('Bearer ')) throw new ElevationError(401, 'authentication_required')
  const token = header.slice(7).trim()
  if (!token) throw new ElevationError(401, 'authentication_required')
  try {
    const decoded = await admin.auth().verifyIdToken(token, true)
    if (!decoded.uid) throw new ElevationError(401, 'authentication_required')
    return decoded.uid
  } catch (error) {
    if (error instanceof ElevationError) throw error
    throw new ElevationError(401, 'authentication_required')
  }
}

export const mapsElevationProvider = onRequest({
  region: REGION,
  timeoutSeconds: 15,
  memory: '256MiB',
  secrets: [ELEVATION_API_KEY],
}, async (request, response) => {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    if (request.method !== 'POST') throw new ElevationError(405, 'method_not_allowed')
    const uid = await authenticatedUid(request)
    if (!isRecord(request.body)) throw new ElevationError(400, 'invalid_json')
    const latitude = request.body.latitude
    const longitude = request.body.longitude
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      throw new ElevationError(400, 'invalid_coordinate')
    }

    await consumeElevationRateLimit(uid)

    const apiKey = ELEVATION_API_KEY.value().trim()
    if (!apiKey) throw new ElevationError(503, 'elevation_unavailable')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    request.on('close', () => controller.abort())
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/elevation/json')
      url.searchParams.set('locations', `${latitude},${longitude}`)
      url.searchParams.set('key', apiKey)
      const upstream = await fetch(url, { signal: controller.signal, cache: 'no-store' })
      if (!upstream.ok) throw new ElevationError(502, 'elevation_provider_error')
      const payload = await upstream.json() as { status?: string; results?: Array<{ elevation?: number; resolution?: number }> }
      const first = payload.status === 'OK' && Array.isArray(payload.results) ? payload.results[0] : undefined
      if (!first || typeof first.elevation !== 'number' || !Number.isFinite(first.elevation)) {
        throw new ElevationError(502, 'elevation_result_unavailable')
      }
      response.status(200).json({
        elevationMeters: first.elevation,
        resolutionMeters: typeof first.resolution === 'number' && Number.isFinite(first.resolution) ? first.resolution : null,
        source: 'google-maps-elevation',
        subject: uid,
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    if (error instanceof ElevationError) {
      response.status(error.status).json({ error: error.code })
      return
    }
    const code = error instanceof Error && error.name === 'AbortError' ? 'elevation_timeout' : 'elevation_provider_error'
    response.status(502).json({ error: code })
  }
})
