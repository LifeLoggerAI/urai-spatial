'use client'

import { getAuth, type User } from 'firebase/auth'
import { useLayoutEffect, useRef, useState } from 'react'
import { app, privacyExportEmulatorOrigin } from '@/lib/firebase/client'
import { fetchAuthorizedOperationalExport, OperationalExportDownloadSession, validateOperationalExportDescriptor, type OperationalExportDescriptor } from '@/lib/privacy/authorizedExportDownload'
import type { getOperationalExportDownloadUrl, PrivacyRow } from '@/lib/privacy/operationalPrivacyClient'

type DownloadRequest = Parameters<typeof getOperationalExportDownloadUrl>[0]

function sameSelectedBytes(job: PrivacyRow, request: DownloadRequest, descriptor: OperationalExportDescriptor): boolean {
  const rowExpiry = job.expiresAt
  if (typeof rowExpiry?.toMillis !== 'function' || rowExpiry.toMillis() !== descriptor.packageExpiresAt) return false
  if (!request.assetId) return job.checksum === descriptor.checksum && job.exportGeneration === descriptor.storageGeneration && job.exportBytes === descriptor.byteLength
  const matches = Array.isArray(job.runtimeExports) ? job.runtimeExports.filter(entry => entry?.assetId === request.assetId) : []
  return matches.length === 1 && matches[0].runtimeSha256 === descriptor.checksum && matches[0].exportGeneration === descriptor.storageGeneration && matches[0].runtimeBytes === descriptor.byteLength
}

export default function OperationalExportDownloads({ job, owner, requestDownload, onError }: {
  job: PrivacyRow
  owner: User
  requestDownload: typeof getOperationalExportDownloadUrl
  onError: (message: string) => void
}) {
  const [session] = useState(() => new OperationalExportDownloadSession())
  const current = useRef<object | null>(null)
  const pending = useRef<object | null>(null)
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    current.current = {}
    pending.current = null
    setBusy(false)
    const offline = () => session.stop()
    window.addEventListener('offline', offline)
    return () => { current.current = null; session.stop(); window.removeEventListener('offline', offline) }
  }, [job, owner, session])

  async function download(assetId?: string) {
    const view = current.current
    const projectId = app.options.projectId
    const isCurrent = () => !!projectId && app.options.projectId === projectId && view !== null && current.current === view && navigator.onLine
      && getAuth(app).currentUser === owner
    if (!isCurrent() || pending.current || job.state !== 'ready' || job.uid !== owner.uid) return
    pending.current = view
    setBusy(true)
    try {
      const request: DownloadRequest = assetId ? { jobId: job.id, file: 'runtime', assetId } : { jobId: job.id }
      await session.download(request, isCurrent, async (_selection, lifecycle) => {
        const receipt = await requestDownload(request)
        const emulatorOrigin = privacyExportEmulatorOrigin()
        const descriptor = validateOperationalExportDescriptor(receipt, request, projectId ?? '', Date.now(), emulatorOrigin)
        if (!lifecycle.isCurrent() || descriptor.ownerId !== owner.uid || !sameSelectedBytes(job, request, descriptor)) throw new Error('EXPORT_DOWNLOAD_UNAVAILABLE')
        return fetchAuthorizedOperationalExport({ descriptor, request, projectId: projectId ?? '', emulatorOrigin,
          ...lifecycle, getIdToken: () => owner.getIdToken(true) })
      })
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
    {busy && <button type="button" onClick={() => session.stop()}>Cancel download</button>}
    {assetIds.map(assetId => <button key={assetId} type="button" disabled={busy}
      onClick={() => void download(assetId)}>Runtime {assetId.slice(0, 8)}</button>)}
  </>
}
