export type OperationalExportRequest = { jobId: string; file?: 'export' | 'manifest' | 'runtime'; assetId?: string }
export type OperationalExportDescriptor = {
  schemaVersion: 'urai-spatial-export-download-v1'
  requiresAuthorization: true
  ownerId: string
  jobId: string
  file: 'export' | 'manifest' | 'runtime'
  assetId: string | null
  url: string
  downloadExpiresAt: number
  packageExpiresAt: number
  checksum: string
  contentType: 'application/json' | 'application/octet-stream'
  byteLength: number
  storageGeneration: string
}

// A browser Blob transfer is bounded independently of server streaming capacity.
export const MAX_OPERATIONAL_EXPORT_BYTES = 64 * 1024 * 1024
export const CANONICAL_SINGLE_RESPONSE_BYTES = 10_000_000
export const CANONICAL_EXPORT_RANGE_BYTES = 4 * 1024 * 1024
const MAX_DELIVERY_TTL_MS = 15 * 60 * 1000
const MAX_TRANSFER_TIME_MS = 120_000
export class OperationalExportDownloadError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'OperationalExportDownloadError' }
}
const invalid = () => new OperationalExportDownloadError('INVALID_EXPORT_DESCRIPTOR')
const current = (signal: AbortSignal, isCurrent: () => boolean) => {
  if (signal.aborted || !isCurrent()) throw new DOMException('Export transfer stopped.', 'AbortError')
}

export function validateOperationalExportDescriptor(value: unknown, request: OperationalExportRequest, projectId: string, now = Date.now(), emulatorOrigin?: string): OperationalExportDescriptor {
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(projectId) || !value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
  const d = value as Record<string, unknown>
  const file = request.file ?? 'export'
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(request.jobId) || !['export', 'manifest', 'runtime'].includes(file)) throw invalid()
  if (d.requiresAuthorization !== true) throw new OperationalExportDownloadError('MEDIATED_EXPORT_REQUIRED')
  if (d.schemaVersion !== 'urai-spatial-export-download-v1' || typeof d.ownerId !== 'string' || !d.ownerId || d.jobId !== request.jobId || d.file !== file
    || d.assetId !== (file === 'runtime' ? request.assetId : null)
    || (file !== 'runtime' && request.assetId !== undefined)
    || (file === 'runtime' && (typeof request.assetId !== 'string' || !request.assetId || request.assetId.length > 128))
    || typeof d.url !== 'string' || d.url.length > 3000
    || typeof d.checksum !== 'string' || !/^[0-9a-f]{64}$/.test(d.checksum)
    || d.contentType !== (file === 'runtime' ? 'application/octet-stream' : 'application/json')
    || typeof d.storageGeneration !== 'string' || !/^[1-9][0-9]{0,29}$/.test(d.storageGeneration)
    || typeof d.byteLength !== 'number' || !Number.isSafeInteger(d.byteLength) || d.byteLength <= 0
    || typeof d.downloadExpiresAt !== 'number' || !Number.isSafeInteger(d.downloadExpiresAt)
    || typeof d.packageExpiresAt !== 'number' || !Number.isSafeInteger(d.packageExpiresAt)
    || d.downloadExpiresAt <= now || d.packageExpiresAt < d.downloadExpiresAt
    || d.downloadExpiresAt > now + MAX_DELIVERY_TTL_MS) throw invalid()
  if (d.byteLength > MAX_OPERATIONAL_EXPORT_BYTES) throw new OperationalExportDownloadError('EXPORT_TOO_LARGE')
  let url: URL
  try { url = new URL(d.url) } catch { throw invalid() }
  if (!matchesExportEndpoint(url, projectId, 'downloadOperationalExportPackage', emulatorOrigin)) throw invalid()
  const keys = file === 'runtime' ? ['jobId', 'file', 'expiresAt', 'authorityHash', 'assetId'] : ['jobId', 'file', 'expiresAt', 'authorityHash']
  if ([...url.searchParams.keys()].length !== keys.length || keys.some(key => url.searchParams.getAll(key).length !== 1)
    || [...url.searchParams.keys()].some(key => !keys.includes(key))
    || url.searchParams.get('jobId') !== request.jobId || url.searchParams.get('file') !== file
    || url.searchParams.get('expiresAt') !== String(d.downloadExpiresAt)
    || !/^[0-9a-f]{64}$/.test(url.searchParams.get('authorityHash') ?? '')
    || (file === 'runtime' && url.searchParams.get('assetId') !== request.assetId)) throw invalid()
  return d as OperationalExportDescriptor
}

export async function fetchAuthorizedOperationalExport(options: {
  descriptor: unknown
  request: OperationalExportRequest
  projectId: string
  signal: AbortSignal
  isCurrent: () => boolean
  getIdToken: () => Promise<string>
  fetcher?: typeof fetch
  emulatorOrigin?: string
}): Promise<{ blob: Blob; filename: string; expiresAt: number }> {
  // No token is acquired or sent until the independent Spatial namespace is pinned.
  const validate = () => validateOperationalExportDescriptor(options.descriptor, options.request, options.projectId, Date.now(), options.emulatorOrigin)
  const descriptor = validate()
  return fetchVerifiedExport({ ...options, descriptor, validate })
}

export function matchesExportEndpoint(url: URL, projectId: string, handler: 'downloadOperationalExportPackage' | 'downloadExportPackage', emulatorOrigin?: string): boolean {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) || url.username || url.password || url.hash) return false
  if (emulatorOrigin !== undefined) {
    return /^http:\/\/(localhost|127\.0\.0\.1):[1-9][0-9]{1,4}$/.test(emulatorOrigin)
      && url.origin === emulatorOrigin && url.pathname === `/${projectId}/us-central1/${handler}`
  }
  return url.origin === `https://us-central1-${projectId}.cloudfunctions.net` && url.pathname === `/${handler}`
}

type Delivery = Pick<OperationalExportDescriptor, 'url' | 'file' | 'jobId' | 'checksum' | 'contentType' | 'byteLength' | 'downloadExpiresAt'> & {
  range?: { size: typeof CANONICAL_EXPORT_RANGE_BYTES; generation: string }
}
export async function fetchVerifiedExport(options: {
  descriptor: Delivery; signal: AbortSignal; isCurrent: () => boolean; getIdToken: () => Promise<string>;
  validate: () => unknown; fetcher?: typeof fetch
}): Promise<{ blob: Blob; filename: string; expiresAt: number }> {
  const { descriptor, signal } = options
  function assertCurrent() {
    current(signal, options.isCurrent)
    if (Date.now() >= descriptor.downloadExpiresAt) throw new OperationalExportDownloadError('EXPORT_EXPIRED')
    options.validate()
  }
  assertCurrent()
  if (!Number.isSafeInteger(descriptor.byteLength) || descriptor.byteLength < 1 || descriptor.byteLength > MAX_OPERATIONAL_EXPORT_BYTES) {
    throw new OperationalExportDownloadError('EXPORT_TOO_LARGE')
  }
  if (descriptor.range && (descriptor.range.size !== CANONICAL_EXPORT_RANGE_BYTES
    || descriptor.byteLength <= CANONICAL_SINGLE_RESPONSE_BYTES || !/^[1-9][0-9]{0,29}$/.test(descriptor.range.generation))) {
    throw new OperationalExportDownloadError('EXPORT_RANGE_INVALID')
  }
  const bytes = new Uint8Array(descriptor.byteLength)
  let offset = 0
  while (offset < bytes.length) {
    assertCurrent()
    const start = offset
    const range = descriptor.range
    const end = range ? Math.min(start + range.size, bytes.length) - 1 : bytes.length - 1
    const token = await options.getIdToken()
    assertCurrent()
    if (!token || /[\r\n]/.test(token)) throw new OperationalExportDownloadError('AUTH_REQUIRED')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (range) headers.Range = `bytes=${start}-${end}`
    const response = await (options.fetcher ?? fetch)(descriptor.url, {
      method: 'GET', headers, signal, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
    })
    try {
      assertCurrent()
      if (response.status !== (range ? 206 : 200) || response.redirected || (response.url && response.url !== descriptor.url)) {
        throw new OperationalExportDownloadError('EXPORT_UNAVAILABLE')
      }
      const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
      if (mime !== descriptor.contentType || !response.body) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
      const statedLength = response.headers.get('content-length')
      if (statedLength !== null && (!/^[0-9]+$/.test(statedLength) || Number(statedLength) !== end - start + 1)) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
      if (range && (statedLength === null || response.headers.get('content-range') !== `bytes ${start}-${end}/${bytes.length}`
        || response.headers.get('etag') !== `"${range.generation}"`
        || ![null, 'identity'].includes(response.headers.get('content-encoding')))) throw new OperationalExportDownloadError('EXPORT_RANGE_INVALID')
    } catch (error) { await response.body?.cancel().catch(() => undefined); throw error }
    const reader = response.body!.getReader()
    const cancel = () => { void reader.cancel().catch(() => undefined) }
    signal.addEventListener('abort', cancel, { once: true })
    try {
      for (;;) {
        assertCurrent()
        const next = await reader.read()
        assertCurrent()
        if (next.done) break
        if (offset + next.value.byteLength > end + 1) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
        bytes.set(next.value, offset)
        offset += next.value.byteLength
      }
    } finally {
      signal.removeEventListener('abort', cancel)
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
    if (offset !== end + 1) throw new OperationalExportDownloadError('EXPORT_INTEGRITY_FAILED')
  }
  if (!globalThis.crypto?.subtle) throw new OperationalExportDownloadError('EXPORT_INTEGRITY_FAILED')
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  assertCurrent()
  if (Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') !== descriptor.checksum) throw new OperationalExportDownloadError('EXPORT_INTEGRITY_FAILED')
  return { blob: new Blob([bytes], { type: descriptor.contentType }), filename: `urai-${descriptor.file}-${descriptor.jobId}.${descriptor.file === 'runtime' ? 'bin' : 'json'}`, expiresAt: descriptor.downloadExpiresAt }
}

type ExportDelivery = { blob: Blob; filename: string; expiresAt: number }
type LoadExport = (request: OperationalExportRequest, lifecycle: { signal: AbortSignal; isCurrent: () => boolean }) => Promise<ExportDelivery>

// URLs represent already received private bytes, not revocable server grants.
// Stop/unmount revokes local URLs. Files already saved cannot be recalled.
export class OperationalExportDownloadSession {
  private controller: AbortController | null = null
  private revisionCounter = 0
  private cleanups = new Set<() => void>()
  get active() { return this.controller !== null }
  get revision() { return this.revisionCounter }
  stop() {
    this.revisionCounter += 1
    this.controller?.abort()
    this.controller = null
    for (const cleanup of [...this.cleanups]) cleanup()
  }
  async download(request: OperationalExportRequest, isCurrent: () => boolean, load: LoadExport) {
    this.stop()
    const controller = new AbortController()
    this.controller = controller
    const timeout = setTimeout(() => controller.abort(), MAX_TRANSFER_TIME_MS)
    const owns = () => this.controller === controller && isCurrent()
    try {
      current(controller.signal, owns)
      const delivery = await load(request, { signal: controller.signal, isCurrent: owns })
      current(controller.signal, owns)
      const ttl = Math.min(60_000, delivery.expiresAt - Date.now())
      if (ttl <= 0) throw new OperationalExportDownloadError('EXPORT_EXPIRED')
      const url = URL.createObjectURL(delivery.blob)
      let timer: ReturnType<typeof setTimeout>
      let cleaned = false
      const cleanup = () => { if (cleaned) return; cleaned = true; clearTimeout(timer); URL.revokeObjectURL(url); this.cleanups.delete(cleanup) }
      this.cleanups.add(cleanup)
      timer = setTimeout(cleanup, ttl)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = delivery.filename
        anchor.rel = 'noopener'
        anchor.referrerPolicy = 'no-referrer'
        document.body.appendChild(anchor)
        current(controller.signal, owns)
        anchor.click()
      } catch (error) { cleanup(); throw error } finally { anchor.remove() }
    } finally { clearTimeout(timeout); if (this.controller === controller) this.controller = null }
  }
}
