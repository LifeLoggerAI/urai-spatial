'use client'

import { getAuth, type User } from 'firebase/auth'
import { useLayoutEffect, useRef, useState } from 'react'
import { app } from '@/lib/firebase/client'
import type { getOperationalExportDownloadUrl, PrivacyRow } from '@/lib/privacy/operationalPrivacyClient'

type DownloadRequest = Parameters<typeof getOperationalExportDownloadUrl>[0]

function exportDestination(
  job: PrivacyRow,
  owner: User,
  request: DownloadRequest,
  result: Record<string, unknown>,
): string {
  const bucket = app.options.storageBucket
  const file = request.assetId ? 'runtime' : 'export'
  const expiresAt = typeof result.expiresAt === 'string' ? Date.parse(result.expiresAt) : NaN
  const packageExpiry = job.expiresAt
  const now = Date.now()
  if (!bucket || job.uid !== owner.uid || job.state !== 'ready' || result.jobId !== job.id
    || result.file !== file || result.assetId !== (request.assetId ?? null)
    || typeof result.url !== 'string' || !Number.isFinite(expiresAt) || expiresAt <= now
    || (packageExpiry && (typeof packageExpiry.toMillis !== 'function' || !(packageExpiry.toMillis() > now)))) {
    throw new Error('EXPORT_DOWNLOAD_UNAVAILABLE')
  }

  let object = 'export.json'
  if (request.assetId) {
    const asset = Array.isArray(job.runtimeExports)
      ? job.runtimeExports.find(entry => entry?.assetId === request.assetId)
      : undefined
    if (typeof result.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(result.checksum)
      || asset?.runtimeSha256 !== result.checksum) throw new Error('EXPORT_DOWNLOAD_UNAVAILABLE')
    object = `spatial/captured-reality/${request.assetId}/${result.checksum}.splat`
  } else if (job.checksum && result.checksum !== job.checksum) {
    throw new Error('EXPORT_DOWNLOAD_UNAVAILABLE')
  }

  const path = `/private-exports/${owner.uid}/${job.id}/${object}`
  const url = new URL(result.url)
  const pathname = decodeURIComponent(url.pathname)
  const expectedObject = (url.hostname === 'storage.googleapis.com' && pathname === '/' + bucket + path)
    || (url.hostname === bucket + '.storage.googleapis.com' && pathname === path)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !expectedObject) {
    throw new Error('EXPORT_DOWNLOAD_UNAVAILABLE')
  }
  return url.href
}

export default function OperationalExportDownloads({ job, owner, requestDownload, onError }: {
  job: PrivacyRow
  owner: User
  requestDownload: typeof getOperationalExportDownloadUrl
  onError: (message: string) => void
}) {
  const current = useRef<object | null>(null)
  const pending = useRef<object | null>(null)
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    current.current = {}
    pending.current = null
    setBusy(false)
    return () => { current.current = null }
  }, [job, owner])

  async function download(assetId?: string) {
    const view = current.current
    const isCurrent = () => view !== null && current.current === view && navigator.onLine
      && getAuth(app).currentUser === owner
    if (!isCurrent() || pending.current || job.state !== 'ready' || job.uid !== owner.uid) return
    pending.current = view
    setBusy(true)
    try {
      const request: DownloadRequest = assetId ? { jobId: job.id, file: 'runtime', assetId } : { jobId: job.id }
      const receipt = await requestDownload(request)
      if (isCurrent()) window.location.assign(exportDestination(job, owner, request, receipt))
    } catch {
      if (isCurrent()) onError('Secure export download could not be authorized.')
    } finally {
      if (current.current === view) {
        pending.current = null
        setBusy(false)
      }
    }
  }

  const assetIds = Array.isArray(job.runtimeExports)
    ? job.runtimeExports.flatMap(entry => typeof entry?.assetId === 'string' && entry.assetId ? [entry.assetId] : [])
    : []
  return <>
    <button type="button" disabled={busy} onClick={() => void download()}>Secure download</button>{' '}
    {assetIds.map(assetId => <button key={assetId} type="button" disabled={busy}
      onClick={() => void download(assetId)}>Runtime {assetId.slice(0, 8)}</button>)}
  </>
}
