'use client'

import { useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { attachOwnedMemoryFile, MEMORY_MEDIA_TYPES } from '@/lib/privacy/ownedMemoryMediaClient'
import type { SelectedMemory } from './selectedMemoryContract'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'
import type { UraiMessageId } from '@/lib/i18n/locales'
import { copyProps, memoryMediaCopy } from '@/lib/i18n/journeyControlCopy'

export default function MemoryMediaAttachment({ memory }: { memory: SelectedMemory }) {
  const locale = useUraiLocale()
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<UraiMessageId | null>(null)
  const epoch = useRef(0), transfer = useRef<AbortController | null>(null), input = useRef<HTMLInputElement | null>(null)
  const operation = useRef<string | null>(null)
  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const stop = () => { epoch.current++; transfer.current?.abort(); transfer.current = null }
    const unsubscribe = onAuthStateChanged(getAuth(app), user => {
      stop(); operation.current = null; setOwnerId(user?.uid ?? null); setFile(null); setBusy(false); setMessage(null)
      if (input.current) input.current.value = ''
    })
    return () => { stop(); unsubscribe() }
  }, [memory.id, memory.ownerId])

  const attachFile = async () => {
    if (!file || busy || transfer.current || !operation.current || ownerId !== memory.ownerId || memory.demo || memory.privacy !== 'private') return
    const controller = new AbortController(), generation = epoch.current
    transfer.current = controller
    const isCurrent = () => epoch.current === generation && transfer.current === controller && !controller.signal.aborted
    setBusy(true); setMessage('memoryMedia.attaching')
    try {
      await attachOwnedMemoryFile(memory, file, { signal: controller.signal, isCurrent }, operation.current)
      if (!isCurrent()) return
      setMessage('memoryMedia.attached')
      setFile(null); operation.current = null; if (input.current) input.current.value = ''
    } catch (error) {
      if (!isCurrent()) return
      const code = error instanceof Error ? error.message : ''
      setMessage(code === 'RECENT_AUTHENTICATION_REQUIRED' ? 'memoryMedia.reauthenticate'
        : code === 'OFFLINE' ? 'memoryMedia.offline'
          : code === 'FILE_TYPE_OR_SIZE_UNSUPPORTED' ? 'memoryMedia.unsupported'
            : 'memoryMedia.unconfirmed')
    } finally {
      if (isCurrent()) { setBusy(false); transfer.current = null }
    }
  }
  if (memory.demo || memory.privacy !== 'private' || ownerId !== memory.ownerId) return null
  const statusCopy = message ? memoryMediaCopy(locale.preference,message) : null
  return <details className="memoryMediaAttachment">
    <summary {...locale.props('memoryMedia.summary')}>{locale.text('memoryMedia.summary')}</summary>
    <p {...locale.props('memoryMedia.instructions')}>{locale.text('memoryMedia.instructions')}</p>
    <label><span {...locale.props('memoryMedia.fileLabel')}>{locale.text('memoryMedia.fileLabel')}</span><input ref={input} type="file" accept={MEMORY_MEDIA_TYPES} disabled={busy}
      onChange={event => { setFile(event.currentTarget.files?.[0] ?? null); operation.current = `memory-media-${crypto.randomUUID()}`; setMessage(null) }} /></label>
    <button type="button" disabled={!file || busy} onClick={attachFile} {...locale.props(busy ? 'memoryMedia.pending' : 'memoryMedia.attach')}>{locale.text(busy ? 'memoryMedia.pending' : 'memoryMedia.attach')}</button>
    <span role="status" aria-live="polite" {...(statusCopy ? copyProps(statusCopy) : {})}>{statusCopy?.text ?? ''}</span>
    <style>{`.memoryMediaAttachment{margin-top:12px}.memoryMediaAttachment summary,.memoryMediaAttachment button{min-height:48px;cursor:pointer}.memoryMediaAttachment label,.memoryMediaAttachment span{display:block;margin:8px 0;font-size:12px}.memoryMediaAttachment input{display:block;max-width:100%;margin-top:8px}.memoryMediaAttachment button{padding:0 14px;border:1px solid rgba(220,248,255,.35);border-radius:16px;background:#07121c;color:#fff}.memoryMediaAttachment button:disabled{opacity:.6;cursor:default}.memoryMediaAttachment :focus-visible{outline:3px solid #e7fbff;outline-offset:3px}`}</style>
  </details>
}
