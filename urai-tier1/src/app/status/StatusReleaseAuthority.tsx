'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { launchTruth } from '@/data/launchTruth'

type Fingerprint = {
  schemaVersion: string
  repository: string
  authoritySha: string
  releaseSha: string
  rollbackSha: string
  firebaseProject: string
  liveUrl: string
  deploymentScope: 'hosting-only'
  workflowRunId: string | number
}

type AuthorityState =
  | { kind: 'loading' }
  | { kind: 'preview' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; fingerprint: Fingerprint }

type RouteState = 'certified-live' | 'preview'
type RouteItem = readonly [route: string, state: RouteState, note: string]

const groups: ReadonlyArray<{ title: string; items: ReadonlyArray<RouteItem> }> = [
  {
    title: 'Launch spine',
    items: [
      ['/', 'certified-live', 'Home threshold entry'],
      ['/home', 'certified-live', 'Canonical Home World'],
      ['/ground', 'certified-live', 'Private operating world'],
      ['/life-map', 'certified-live', 'Spatial memory galaxy'],
      ['/focus', 'certified-live', 'Selected memory chamber'],
      ['/replay', 'certified-live', 'Memory film route'],
      ['/mirror', 'certified-live', 'Reflection realm'],
      ['/passport', 'certified-live', 'Identity vault'],
      ['/status', 'certified-live', 'Route and certification room'],
    ],
  },
  {
    title: 'Trust and place',
    items: [
      ['/privacy-controls', 'certified-live', 'Permission controls'],
      ['/location-map', 'certified-live', 'Place and emotional weather'],
      ['/ascent', 'certified-live', 'Sky ascent route'],
      ['/unwind', 'certified-live', 'Return route'],
    ],
  },
  {
    title: 'Showcase and XR',
    items: [
      ['/demo', 'certified-live', 'Disclosed public walkthrough'],
      ['/demo/replay-film', 'certified-live', 'Disclosed Replay film proof surface'],
      ['/spatial/life-map', 'certified-live', 'Spatial Life Map'],
      ['/spatial/life-map-r3f', 'certified-live', 'R3F Life Map'],
      ['/spatial/ar-vr', 'preview', 'Live browser preview; physical verification remains separate'],
    ],
  },
]

const totalRoutes = groups.reduce((sum, group) => sum + group.items.length, 0)
const shaPattern = /^[0-9a-f]{40}$/
const runIdPattern = /^[1-9][0-9]*$/
const shortSha = (sha: string) => sha.slice(0, 12)

function validate(value: unknown): Fingerprint {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Release fingerprint is missing or malformed.')
  }

  const item = value as Partial<Fingerprint>
  if (item.schemaVersion !== 'urai-release-fingerprint-1') throw new Error('Release fingerprint schema is not recognized.')
  if (item.repository !== 'LifeLoggerAI/urai-spatial') throw new Error('Release fingerprint repository is not canonical.')

  for (const field of ['authoritySha', 'releaseSha', 'rollbackSha'] as const) {
    if (typeof item[field] !== 'string' || !shaPattern.test(item[field])) {
      throw new Error(`Release fingerprint ${field} is invalid.`)
    }
  }

  if (item.authoritySha !== item.releaseSha) throw new Error('Release and authority SHA do not match.')
  if (item.releaseSha === item.rollbackSha) throw new Error('Release and rollback authority must remain distinct.')
  if (item.firebaseProject !== 'urai-4dc1d') throw new Error('Firebase project is not canonical.')
  if (item.liveUrl !== 'https://urai.app') throw new Error('Public origin is not canonical.')
  if (item.deploymentScope !== 'hosting-only') throw new Error('Deployment scope is not the protected hosting-only boundary.')

  const runId = item.workflowRunId
  const validRunId =
    (typeof runId === 'number' && Number.isSafeInteger(runId) && runId > 0) ||
    (typeof runId === 'string' && runIdPattern.test(runId))
  if (!validRunId) throw new Error('Workflow run ID is invalid.')

  return item as Fingerprint
}

function badgeClass(label: string) {
  if (label === 'verified live') return 'border-emerald-200/30 bg-emerald-200 text-slate-950'
  if (label === 'preview') return 'border-amber-200/30 bg-amber-200 text-slate-950'
  return 'border-violet-200/30 bg-violet-200 text-slate-950'
}

export default function StatusReleaseAuthority() {
  const [state, setState] = useState<AuthorityState>({ kind: 'loading' })

  useEffect(() => {
    if (window.location.origin !== 'https://urai.app') {
      setState({ kind: 'preview' })
      return
    }

    const controller = new AbortController()
    fetch(`/release-fingerprint.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-cache, no-store, max-age=0' },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Release fingerprint request returned ${response.status}.`)
        const contentType = response.headers.get('content-type')?.toLowerCase() || ''
        if (!contentType.includes('application/json')) throw new Error('Release fingerprint response is not JSON.')
        return response.json()
      })
      .then((value) => setState({ kind: 'ready', fingerprint: validate(value) }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Release fingerprint could not be verified.',
          })
        }
      })

    return () => controller.abort()
  }, [])

  const isReady = state.kind === 'ready'
  const unresolvedCopy =
    state.kind === 'preview'
      ? 'This preview origin does not request production authority. Open urai.app to validate and display the protected live fingerprint.'
      : state.kind === 'error'
        ? 'Production certification is hidden because the protected fingerprint could not be validated.'
        : 'Production certification remains hidden until the protected fingerprint is validated.'

  return (
    <div data-authority-state={state.kind}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
        <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">URAI Status · Launch Truth Control Room</p>
          <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.82] tracking-[-0.1em] md:text-8xl">
            Launch locked. Proof before expansion.
          </h1>
          <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-200/80">
            {isReady
              ? 'The canonical Spatial web release is verified live through the protected public fingerprint shown beside this statement. Unsupported expansion claims—physical XR, providers, autonomous actions, and the supporting estate—remain separately gated.'
              : unresolvedCopy}
          </p>
        </article>

        <article
          className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl"
          data-testid="urai-status-release-authority"
          aria-live="polite"
        >
          <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />
          {state.kind === 'loading' && (
            <div className="rounded-2xl border border-cyan-100/15 bg-cyan-100/[0.06] p-5">
              <strong className="block text-2xl">Reading protected fingerprint…</strong>
              <p className="mt-3 text-sm">No live or candidate SHA is displayed while authority is unresolved.</p>
            </div>
          )}
          {state.kind === 'preview' && (
            <div className="rounded-2xl border border-violet-200/25 bg-violet-200/[0.08] p-5">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">Tracked {totalRoutes} public routes</span>
              <strong className="mt-2 block text-2xl">Production fingerprint is read only on urai.app.</strong>
              <p className="mt-3 text-sm">This proof origin does not request or substitute a live or candidate SHA.</p>
            </div>
          )}
          {state.kind === 'error' && (
            <div className="rounded-2xl border border-rose-200/25 bg-rose-200/[0.08] p-5" role="alert">
              <strong className="block text-2xl">Live certification cannot be displayed.</strong>
              <p className="mt-3 text-sm">{state.message}</p>
            </div>
          )}
          {state.kind === 'ready' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"><span className="text-xs">Tracked</span><strong className="mt-2 block text-2xl">{totalRoutes}</strong></div>
              <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.08] p-5"><span className="text-xs">Production</span><strong className="mt-2 block text-2xl">Verified live</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"><span className="text-xs">Release</span><strong className="mt-2 block font-mono" title={state.fingerprint.releaseSha}>{shortSha(state.fingerprint.releaseSha)}</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"><span className="text-xs">Rollback</span><strong className="mt-2 block font-mono" title={state.fingerprint.rollbackSha}>{shortSha(state.fingerprint.rollbackSha)}</strong></div>
              <dl className="col-span-2 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs">
                <div className="flex justify-between"><dt>Authority</dt><dd className="font-mono">{shortSha(state.fingerprint.authoritySha)}</dd></div>
                <div className="flex justify-between"><dt>Firebase</dt><dd>{state.fingerprint.firebaseProject}</dd></div>
                <div className="flex justify-between"><dt>Scope</dt><dd>{state.fingerprint.deploymentScope}</dd></div>
                <div className="flex justify-between"><dt>Run</dt><dd>{state.fingerprint.workflowRunId}</dd></div>
              </dl>
            </div>
          )}
        </article>
      </div>

      <section className="mt-6 rounded-[2rem] border border-cyan-100/15 bg-cyan-100/[0.06] p-6 text-sm font-semibold leading-7 text-cyan-50/90">
        <h2 className="text-xl font-black text-cyan-100">Launch truth</h2>
        <p className="mt-2">Safe claim: {isReady ? launchTruth.safeClaim : unresolvedCopy}</p>
        <p className="mt-3">Blocked claim: {launchTruth.unsafeClaim}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.title} className="rounded-[2rem] border border-white/10 bg-slate-950/58 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <h2 className="text-xl font-black tracking-tight">{group.title}</h2>
            <div className="mt-5 grid gap-3">
              {group.items.map(([route, routeState, note]) => {
                const label = routeState === 'preview' ? 'preview' : isReady ? 'verified live' : 'authority unresolved'
                return (
                  <article key={route} className="rounded-2xl border border-cyan-100/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="font-mono text-sm font-black text-cyan-100">{route}</code>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeClass(label)}`}>{label}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/76">{note}</p>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className={`mt-6 rounded-[2rem] border p-6 text-sm font-semibold leading-7 ${isReady ? 'border-emerald-200/20 bg-emerald-200/[0.07] text-emerald-50/90' : 'border-violet-200/20 bg-violet-200/[0.07] text-violet-50/90'}`}>
        <h2 className={`text-xl font-black ${isReady ? 'text-emerald-100' : 'text-violet-100'}`}>Certification boundary</h2>
        <p className="mt-2">
          {isReady
            ? 'Production: verified live for the canonical Spatial web release. Pending proof: physical Quest hardware, provider-backed assets, private supporting services, and the wider repository estate. Autonomous real-world actions are not enabled and remain human-approved only.'
            : 'Production certification is not displayed on this origin or state. Physical Quest hardware, provider-backed assets, private supporting services, the wider repository estate, and autonomous real-world actions remain separately blocked.'}
        </p>
      </section>

      <nav className="mt-6 flex flex-wrap gap-3" aria-label="Status route navigation">
        <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">Open Home</Link>
        <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/ground">Open Ground</Link>
        <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/life-map">Open Life Map</Link>
        <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/privacy-controls">Privacy Controls</Link>
        <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/spatial/ar-vr">Open XR preview</Link>
      </nav>
    </div>
  )
}
