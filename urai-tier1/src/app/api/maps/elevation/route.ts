import { NextResponse } from 'next/server'
import { verifyFirebaseUser } from '@/lib/server/firebase-user'

export const dynamic = 'force-static'

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export async function POST(request: Request) {
  if (process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') {
    return NextResponse.json({ error: 'elevation_unavailable_in_static_export' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })
  }

  const uid = await verifyFirebaseUser(request)
  if (!uid) return NextResponse.json({ error: 'authentication_required' }, { status: 401, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: { 'cache-control': 'private, no-store, max-age=0' } }) }
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const latitude = record.latitude
  const longitude = record.longitude
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) return NextResponse.json({ error: 'invalid_coordinate' }, { status: 400, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  const apiKey = process.env.URAI_ELEVATION_SERVER_CREDENTIAL
  if (!apiKey) return NextResponse.json({ error: 'elevation_unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/elevation/json')
    url.searchParams.set('locations', `${latitude},${longitude}`)
    url.searchParams.set('key', apiKey)
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'elevation_provider_error' }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    const payload = await response.json() as { status?: string; results?: Array<{ elevation?: number; resolution?: number }> }
    const first = payload.status === 'OK' && Array.isArray(payload.results) ? payload.results[0] : undefined
    if (!first || typeof first.elevation !== 'number' || !Number.isFinite(first.elevation)) return NextResponse.json({ error: 'elevation_result_unavailable' }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    return NextResponse.json({ elevationMeters: first.elevation, resolutionMeters: typeof first.resolution === 'number' && Number.isFinite(first.resolution) ? first.resolution : null, source: 'google-maps-elevation', subject: uid }, { headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const code = error instanceof Error && error.name === 'AbortError' ? 'elevation_timeout' : 'elevation_provider_error'
    return NextResponse.json({ error: code }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } finally {
    clearTimeout(timeout)
  }
}
