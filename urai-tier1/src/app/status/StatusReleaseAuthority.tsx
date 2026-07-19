'use client'

import { useEffect, useState } from 'react'

type ReleaseFingerprint = {
  schemaVersion: 'urai-release-fingerprint-1'
  generatedAt: string
  repository: 'LifeLoggerAI/urai-spatial'
  authoritySha: string
  releaseSha: string
  rollbackSha: string
  firebaseProject: string
  liveUrl: string
  deploymentScope: string
  certification: string
  workflowRunId: string | number | null
}

type AuthorityState =
  | { status: 'loading' }
  | { status: 'ready'; fingerprint: ReleaseFingerprint }
  | { status: 'error'; message: string }

const fullSha = /^[0-9a-f]{40}$/

function validateFingerprint(value: unknown): ReleaseFingerprint {
  if (!value || typeof value !== 'object') throw new Error('Release fingerprint is missing or malformed.')
  const fingerprint = value as Partial<ReleaseFingerprint>
  if (fingerprint.schemaVersion !== 'urai-release-fingerprint-1') throw new Error('Release fingerprint schema is not recognized.')
  if (fingerprint.repository !== 'LifeLoggerAI/urai-spatial') throw new Error('Release fingerprint repository does not match canonical authority.')
  if (!fullSha.test(String(fingerprint.authoritySha || ''))) throw new Error('Release fingerprint authority SHA is invalid.')
  if (!fullSha.test(String(fingerprint.releaseSha || ''))) throw new Error('Release fingerprint release SHA is invalid.')
  if (!fullSha.test(String(fingerprint.rollbackSha || ''))) throw new Error('Release fingerprint rollback SHA is invalid.')
  if (fingerprint.releaseSha === fingerprint.rollbackSha) throw new Error('Release and rollback authority must remain distinct.')
  if (fingerprint.firebaseProject !== 'urai-4dc1d') throw new Error('Release fingerprint Firebase project does not match canonical hosting authority.')
  if (fingerprint.liveUrl !== 'https://urai.app') throw new Error('Release fingerprint public origin does not match canonical authority.')
  return fingerprint as ReleaseFingerprint
}

const shortSha = (sha: string) => sha.slice(0, 12)

export default function StatusReleaseAuthority({ totalRoutes }: { totalRoutes: number }) {
  const [authority, setAuthority] = useState<AuthorityState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadAuthority() {
      try {
        const response = await fetch(`/release-fingerprint.json?status=${Date.now()}`, {
          cache: 'no-store',
          headers: { accept: 'application/json', 'cache-control': 'no-cache, no-store, max-age=0' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Release fingerprint request returned ${response.status}.`)
        const fingerprint = validateFingerprint(await response.json())
        setAuthority({ status: 'ready', fingerprint })
      } catch (error) {
        if (controller.signal.aborted) return
        setAuthority({
          status: 'error',
          message: error instanceof Error ? error.message : 'Release fingerprint could not be verified.',
        })
      }
    }

    void loadAuthority()
    return () => controller.abort()
  }, [])

  return (
    <article
      className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl"
      data-testid="urai-status-release-authority"
      data-authority-state={authority.status}
      aria-live="polite"
    >
      <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />

      {authority.status === 'loading' ? (
        <div className="rounded-2xl border border-cyan-100/15 bg-cyan-100/[0.06] p-5">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Production authority</span>
          <strong className="mt-2 block text-2xl">Reading protected fingerprint…</strong>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-200/70">No candidate SHA is displayed while live authority is unresolved.</p>
        </div>
      ) : authority.status === 'error' ? (
        <div className="rounded-2xl border border-rose-200/25 bg-rose-200/[0.08] p-5" role="alert">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">Authority unavailable</span>
          <strong className="mt-2 block text-2xl">Live certification cannot be displayed.</strong>
          <p className="mt-3 text-sm font-semibold leading-6 text-rose-50/80">{authority.message}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Tracked</span>
              <strong className="mt-2 block text-2xl">{totalRoutes}</strong>
            </div>
            <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.08] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Production</span>
              <strong className="mt-2 block text-2xl">Verified live</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Release</span>
              <strong className="mt-2 block font-mono text-base" title={authority.fingerprint.releaseSha}>{shortSha(authority.fingerprint.releaseSha)}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Rollback</span>
              <strong className="mt-2 block font-mono text-base" title={authority.fingerprint.rollbackSha}>{shortSha(authority.fingerprint.rollbackSha)}</strong>
            </div>
          </div>
          <dl className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs font-semibold text-slate-200/76">
            <div className="flex justify-between gap-4"><dt>Authority</dt><dd className="font-mono" title={authority.fingerprint.authoritySha}>{shortSha(authority.fingerprint.authoritySha)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Firebase</dt><dd>{authority.fingerprint.firebaseProject}</dd></div>
            <div className="flex justify-between gap-4"><dt>Scope</dt><dd>{authority.fingerprint.deploymentScope}</dd></div>
            <div className="flex justify-between gap-4"><dt>Run</dt><dd>{authority.fingerprint.workflowRunId || 'recorded in receipt'}</dd></div>
          </dl>
        </>
      )}
    </article>
  )
}
