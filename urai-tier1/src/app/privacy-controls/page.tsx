import Link from 'next/link'
import type { CSSProperties } from 'react'
import { assetCssStack, privacyControlsAssets } from '@/spatial/assets/uraiAssets'

export const metadata = {
  title: 'URAI Privacy Controls Preview',
  description:
    'A non-operational preview of planned URAI privacy, consent, export, deletion, location, model-access, and approval controls.',
}

const previewGroups = [
  {
    label: 'World memory',
    state: 'planned private-by-default boundary',
    copy: 'The intended design keeps memory places, replay beats, objects, and emotional weather private until a person opens a specific permission path. This preview does not save or enforce that setting.',
    examples: ['review before use', 'delete a thread', 'redact people', 'pause replay'],
  },
  {
    label: 'Location precision',
    state: 'planned symbolic-first boundary',
    copy: 'The intended design supports symbolic, city-level, and private exact-location modes. This preview does not read, store, or change a location preference.',
    examples: ['symbolic only', 'city level', 'exact and private', 'share by opt-in'],
  },
  {
    label: 'Model access',
    state: 'planned consent boundary',
    copy: 'The intended design limits model access to approved context and supports revocation. This preview does not grant, deny, audit, or revoke model access.',
    examples: ['approve context', 'deny a model', 'review model access', 'revoke access'],
  },
  {
    label: 'Exports and deletion',
    state: 'planned request workflow',
    copy: 'The intended design includes preview, redaction, expiration, export, and deletion requests with visible progress and recovery. This preview does not start or complete any request.',
    examples: ['preview an export', 'remove names', 'hide location', 'request deletion'],
  },
  {
    label: 'Workforce actions',
    state: 'planned human-approval boundary',
    copy: 'The intended design requires visible approval before external messages, calendar changes, purchases, or relationship actions. This preview does not stage, approve, or send an action.',
    examples: ['draft only', 'ask before sending', 'manual approval', 'activity record'],
  },
  {
    label: 'Legacy and presence',
    state: 'planned protected-presence boundary',
    copy: 'The intended design protects names, relationships, replay material, and legacy-presence experiences behind explicit permissions. This preview does not create or enforce those permissions.',
    examples: ['protect names', 'private replay', 'relationship permission', 'legacy lock'],
  },
] as const

const routeRail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
] as const

const privacyStyle = {
  '--privacy-art-desktop': assetCssStack(privacyControlsAssets.primary),
  '--privacy-art-mobile': assetCssStack(privacyControlsAssets.mobile),
} as CSSProperties

const desktopArtStyle = { backgroundImage: 'var(--privacy-art-desktop)' } as CSSProperties
const mobileArtStyle = { backgroundImage: 'var(--privacy-art-mobile)' } as CSSProperties

export default function PrivacyControlsRoutePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020617] text-white"
      data-route-polish="privacy-consent-console"
      data-launch-surface="premium-privacy-consent-console"
      data-privacy-controls-state="non-operational-preview"
      style={privacyStyle}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_18%,rgba(103,232,249,.2),transparent_28rem),radial-gradient(circle_at_18%_78%,rgba(251,191,36,.12),transparent_26rem),linear-gradient(180deg,rgba(2,6,23,.15),rgba(0,0,0,.74))]" />
      <div className="absolute inset-0 hidden bg-cover bg-center opacity-45 mix-blend-screen brightness-75 contrast-125 saturate-150 md:block" style={desktopArtStyle} />
      <div className="absolute inset-0 bg-cover bg-center opacity-42 mix-blend-screen brightness-70 contrast-125 saturate-150 md:hidden" style={mobileArtStyle} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_0_26%,rgba(0,0,0,.46)_70%,rgba(0,0,0,.86)_100%)]" />
      <div className="absolute left-1/2 top-[44%] h-[34rem] w-[min(52rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] border border-cyan-100/20 bg-white/[.035] shadow-[0_0_140px_rgba(103,232,249,.14),inset_0_0_100px_rgba(255,255,255,.04)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/70">URAI Privacy Controls · Preview</p>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[.9] tracking-[-0.08em] md:text-7xl">
              See the controls URAI is designed to provide.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200/82">
              This route is an explanatory, non-operational preview. It does not save settings, capture consent, revoke access, enforce provider permissions, change location handling, approve real-world actions, or execute export and deletion requests.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-amber-100/20 bg-black/55 p-5 shadow-[0_24px_90px_rgba(0,0,0,.45)] backdrop-blur-2xl" role="note" aria-label="Privacy Controls release posture">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-100/80">Current release posture</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-100">
              <div className="rounded-2xl border border-amber-100/15 bg-amber-100/[.06] p-3">Preview only — no account setting changes here</div>
              <div className="rounded-2xl border border-amber-100/15 bg-amber-100/[.06] p-3">Examples describe intended behavior, not current enforcement</div>
              <div className="rounded-2xl border border-amber-100/15 bg-amber-100/[.06] p-3">Do not enter personal or sensitive information on this page</div>
              <div className="rounded-2xl border border-amber-100/15 bg-amber-100/[.06] p-3">Use Status for current production-certification truth</div>
            </div>
            <Link className="mt-5 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-slate-950 no-underline hover:bg-white" href="/status">
              Open Status
            </Link>
          </aside>
        </header>

        <section className="mt-8 rounded-[2rem] border border-cyan-100/15 bg-cyan-100/[.06] p-5 text-sm font-semibold leading-7 text-cyan-50/90" aria-label="Preview limitation">
          <strong className="text-cyan-100">Nothing on this page is a working privacy control.</strong>{' '}
          Operational controls require authenticated ownership, versioned policy, deny-by-default enforcement, revocation propagation, export and deletion completion, audit evidence, accessible failure recovery, and exact deployed proof.
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Planned privacy control groups">
          {previewGroups.map((group, index) => (
            <article key={group.label} className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[0_26px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/70">{group.label}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{group.state}</h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-100/80">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{group.copy}</p>
              <div className="mt-5" aria-label={`Planned examples for ${group.label}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/70">Planned examples — not buttons</p>
                <ul className="mt-3 grid gap-2 text-xs text-slate-200">
                  {group.examples.map((example) => (
                    <li key={example} className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-2">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>

        <nav className="mt-10 flex flex-wrap gap-3 pb-8" aria-label="URAI privacy preview route chain">
          <Link className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 hover:bg-white" href="/status">View production Status</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/passport">Open Passport preview</Link>
          {routeRail.map(([label, href]) => (
            <Link key={href} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-slate-300 hover:bg-white/10" href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}
