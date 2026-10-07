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
const MAX_DELIVERY_TTL_MS = 15 * 60 * 1000
const MAX_TRANSFER_TIME_MS = 120_000
export class OperationalExportDownloadError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'OperationalExportDownloadError' }
}
const invalid = () => new OperationalExportDownloadError('INVALID_EXPORT_DESCRIPTOR')
const current = (signal: AbortSignal, isCurrent: () => boolean) => {
  if (signal.aborted || !isCurrent()) throw new DOMException('Export transfer stopped.', 'AbortError')
}

export function validateOperationalExportDescriptor(value: unknown, request: OperationalExportRequest, projectId: string, now = Date.now()): OperationalExportDescriptor {
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
  const origin = `https://us-central1-${projectId}.cloudfunctions.net`
  if (url.origin !== origin || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash
    || url.pathname !== '/downloadOperationalExportPackage') throw invalid()
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
}): Promise<{ blob: Blob; filename: string; expiresAt: number }> {
  // No token is acquired or sent until the independent Spatial namespace is pinned.
  const descriptor = validateOperationalExportDescriptor(options.descriptor, options.request, options.projectId)
  current(options.signal, options.isCurrent)
  const token = await options.getIdToken()
  current(options.signal, options.isCurrent)
  validateOperationalExportDescriptor(descriptor, options.request, options.projectId)
  if (!token || /[\r\n]/.test(token)) throw new OperationalExportDownloadError('AUTH_REQUIRED')
  const response = await (options.fetcher ?? fetch)(descriptor.url, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: options.signal,
    credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
  })
  try {
    current(options.signal, options.isCurrent)
    if (!response.ok || response.redirected || (response.url && response.url !== descriptor.url)) throw new OperationalExportDownloadError('EXPORT_UNAVAILABLE')
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (mime !== descriptor.contentType || !response.body) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
    const statedLength = response.headers.get('content-length')
    if (statedLength !== null && (!/^[0-9]+$/.test(statedLength) || Number(statedLength) !== descriptor.byteLength)) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
  } catch (error) { await response.body?.cancel().catch(() => undefined); throw error }
  const reader = response.body.getReader()
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  options.signal.addEventListener('abort', cancel, { once: true })
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      current(options.signal, options.isCurrent)
      if (Date.now() >= descriptor.downloadExpiresAt) throw new OperationalExportDownloadError('EXPORT_EXPIRED')
      const next = await reader.read()
      current(options.signal, options.isCurrent)
      if (next.done) break
      length += next.value.byteLength
      if (length > descriptor.byteLength) throw new OperationalExportDownloadError('EXPORT_CONTENT_INVALID')
      chunks.push(next.value)
    }
  } finally {
    options.signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  if (length !== descriptor.byteLength || !globalThis.crypto?.subtle) throw new OperationalExportDownloadError('EXPORT_INTEGRITY_FAILED')
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  current(options.signal, options.isCurrent)
  validateOperationalExportDescriptor(descriptor, options.request, options.projectId)
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
