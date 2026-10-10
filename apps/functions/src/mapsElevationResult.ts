import { assertSpatialPaidOutputCurrent } from './protectedProviderSpend'

export class ElevationResultError extends Error {
  readonly status = 502
  readonly code = 'elevation_result_unavailable'
  constructor() { super('The bounded elevation result is unavailable.') }
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
/** Consume only a bounded single-coordinate result. Provider errors and credentials stay private. */
export async function readNormalizedElevation(response: Response, input: { latitude: number; longitude: number }) {
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new ElevationResultError() }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      assertSpatialPaidOutputCurrent(response)
      const chunk = await reader.read()
      assertSpatialPaidOutputCurrent(response)
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > 65536) throw new ElevationResultError()
      chunks.push(chunk.value)
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error }
  finally { reader.releaseLock() }
  let payload: unknown
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes))) }
  catch { throw new ElevationResultError() }
  assertSpatialPaidOutputCurrent(response)
  if (!record(payload) || payload.status !== 'OK' || !Array.isArray(payload.results) || payload.results.length !== 1) throw new ElevationResultError()
  const first: unknown = payload.results[0]
  if (!record(first) || typeof first.elevation !== 'number' || !Number.isFinite(first.elevation) || !record(first.location)) throw new ElevationResultError()
  const { lat, lng } = first.location
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat - input.latitude) > 1e-7 || Math.abs(lng - input.longitude) > 1e-7) throw new ElevationResultError()
  if (first.resolution !== undefined && (typeof first.resolution !== 'number' || !Number.isFinite(first.resolution) || first.resolution < 0)) throw new ElevationResultError()
  return { elevationMeters: first.elevation, resolutionMeters: first.resolution ?? null, source: 'google-maps-elevation' as const }
}
