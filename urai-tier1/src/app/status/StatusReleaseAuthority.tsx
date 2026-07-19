'use client'

import { useEffect, useState } from 'react'

type Fingerprint = {
  schemaVersion: string
  repository: string
  authoritySha: string
  releaseSha: string
  rollbackSha: string
  firebaseProject: string
  liveUrl: string
  deploymentScope: string
  workflowRunId: string | number | null
}

type State =
  | { kind: 'loading' }
  | { kind: 'preview' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; fingerprint: Fingerprint }

const shaPattern = /^[0-9a-f]{40}$/
const shortSha = (sha: string) => sha.slice(0, 12)

function validate(value: unknown): Fingerprint {
  if (!value || typeof value !== 'object') throw new Error('Release fingerprint is missing or malformed.')
  const item = value as Partial<Fingerprint>
  if (item.schemaVersion !== 'urai-release-fingerprint-1') throw new Error('Release fingerprint schema is not recognized.')
  if (item.repository !== 'LifeLoggerAI/urai-spatial') throw new Error('Release fingerprint repository is not canonical.')
  for (const field of ['authoritySha', 'releaseSha', 'rollbackSha'] as const) {
    if (!shaPattern.test(String(item[field] || ''))) throw new Error(`Release fingerprint ${field} is invalid.`)
  }
  if (item.releaseSha === item.rollbackSha) throw new Error('Release and rollback authority must remain distinct.')
  if (item.firebaseProject !== 'urai-4dc1d') throw new Error('Firebase project is not canonical.')
  if (item.liveUrl !== 'https://urai.app') throw new Error('Public origin is not canonical.')
  return item as Fingerprint
}

export default function StatusReleaseAuthority({ totalRoutes }: { totalRoutes: number }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    if (window.location.origin !== 'https://urai.app') {
      setState({ kind: 'preview' })
      return
    }
    const controller = new AbortController()
    fetch(`/release-fingerprint.json?status=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-cache, no-store, max-age=0' },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Release fingerprint request returned ${response.status}.`)
        return response.json()
      })
      .then((value) => setState({ kind: 'ready', fingerprint: validate(value) }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Release fingerprint could not be verified.' })
      })
    return () => controller.abort()
  }, [])

  const panel = 'rounded-2xl border p-5'
  return (
    <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl" data-testid="urai-status-release-authority" data-authority-state={state.kind} aria-live="polite">
      <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />
      {state.kind === 'loading' && <div className={`${panel} border-cyan-100/15 bg-cyan-100/[0.06]`}><strong className="block text-2xl">Reading protected fingerprint…</strong><p className="mt-3 text-sm">No candidate SHA is displayed while live authority is unresolved.</p></div>}
      {state.kind === 'preview' && <div className={`${panel} border-violet-200/25 bg-violet-200/[0.08]`}><strong className="block text-2xl">Production fingerprint is read only on urai.app.</strong><p className="mt-3 text-sm">This proof origin does not request or substitute a live or candidate SHA.</p></div>}
      {state.kind === 'error' && <div className={`${panel} border-rose-200/25 bg-rose-200/[0.08]`} role="alert"><strong className="block text-2xl">Live certification cannot be displayed.</strong><p className="mt-3 text-sm">{state.message}</p></div>}
      {state.kind === 'ready' && <div className="grid grid-cols-2 gap-3">
        <div className={`${panel} border-white/10 bg-white/[0.06]`}><span className="text-xs">Tracked</span><strong className="mt-2 block text-2xl">{totalRoutes}</strong></div>
        <div className={`${panel} border-emerald-200/20 bg-emerald-200/[0.08]`}><span className="text-xs">Production</span><strong className="mt-2 block text-2xl">Verified live</strong></div>
        <div className={`${panel} border-white/10 bg-white/[0.06]`}><span className="text-xs">Release</span><strong className="mt-2 block font-mono" title={state.fingerprint.releaseSha}>{shortSha(state.fingerprint.releaseSha)}</strong></div>
        <div className={`${panel} border-white/10 bg-white/[0.06]`}><span className="text-xs">Rollback</span><strong className="mt-2 block font-mono" title={state.fingerprint.rollbackSha}>{shortSha(state.fingerprint.rollbackSha)}</strong></div>
        <dl className="col-span-2 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs">
          <div className="flex justify-between"><dt>Authority</dt><dd className="font-mono">{shortSha(state.fingerprint.authoritySha)}</dd></div>
          <div className="flex justify-between"><dt>Firebase</dt><dd>{state.fingerprint.firebaseProject}</dd></div>
          <div className="flex justify-between"><dt>Scope</dt><dd>{state.fingerprint.deploymentScope}</dd></div>
          <div className="flex justify-between"><dt>Run</dt><dd>{state.fingerprint.workflowRunId || 'recorded in receipt'}</dd></div>
        </dl>
      </div>}
    </article>
  )
}
