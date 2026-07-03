import Link from 'next/link'
import type { CSSProperties } from 'react'
import { assetCssStack, privacyControlsAssets } from '@/spatial/assets/uraiAssets'

export const metadata = {
  title: 'URAI Privacy Controls',
  description:
    'URAI Privacy Controls make data ownership, consent, deletion, exports, and model access visible before the world acts.',
}

const controlGroups = [
  {
    label: 'World memory',
    state: 'private by default',
    copy: 'Memory places, replay beats, objects, and emotional weather stay inside the private world until the person chooses what can be used.',
    controls: ['review before use', 'delete thread', 'redact people', 'pause replay'],
  },
  {
    label: 'Location precision',
    state: 'symbolic first',
    copy: 'Places can render as rooms, seasons, thresholds, or city-level signals without exposing exact coordinates to the public surface.',
    controls: ['symbolic-only', 'city-only', 'exact private', 'share opt-in'],
  },
  {
    label: 'Model access',
    state: 'gated by consent',
    copy: 'The orb, workforce, and route engines can only use approved context. Raw life data is not treated as an open model feed.',
    controls: ['approve context', 'deny model', 'audit prompt', 'revoke access'],
  },
  {
    label: 'Exports',
    state: 'redaction first',
    copy: 'Images, videos, scrolls, and share links pass through a visible redaction layer before anything leaves the private world.',
    controls: ['preview export', 'remove names', 'hide location', 'expire link'],
  },
  {
    label: 'Workforce actions',
    state: 'human-led',
    copy: 'Ground helpers can stage tasks and drafts, but approval stays visible before messages, calendar changes, purchases, or relationship actions happen.',
    controls: ['draft only', 'ask before send', 'manual approve', 'activity log'],
  },
  {
    label: 'Legacy and presence',
    state: 'protected',
    copy: 'Replay, Mirror, and legacy-presence surfaces keep identity, people, and sensitive memories protected unless a permission path is opened.',
    controls: ['protected names', 'private replay', 'relationship gate', 'legacy lock'],
  },
] as const

const routeRail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['Status', '/status'],
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
            <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/70">URAI Privacy Controls</p>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[.9] tracking-[-0.08em] md:text-7xl">
              Choose what the world can hold.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200/82">
              Privacy Controls are the living control room for Passport, Ground, Replay, Mirror, Location Map, and the orb. The world can help, but consent stays visible, reversible, and human-led.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[0_24px_90px_rgba(0,0,0,.45)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-100/70">Release posture</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3">Private by default</div>
              <div className="rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3">No hidden raw-data sharing</div>
              <div className="rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3">Export and deletion controls visible</div>
              <div className="rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3">Human approval before real-world action</div>
            </div>
          </aside>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Privacy control groups">
          {controlGroups.map((group, index) => (
            <article key={group.label} className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[0_26px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-cyan-100/25 hover:bg-black/55">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/70">{group.label}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{group.state}</h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-100/80">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{group.copy}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {group.controls.map((control) => (
                  <span key={control} className="rounded-full border border-white/15 bg-white/[.04] px-3 py-1 text-xs text-slate-200">
                    {control}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <nav className="mt-10 flex flex-wrap gap-3 pb-8" aria-label="URAI privacy route chain">
          <Link className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 hover:bg-white" href="/passport">Open Passport</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/life-map">Life Map</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/ground">Ground</Link>
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
