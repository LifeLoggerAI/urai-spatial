import Link from 'next/link'
import type { CSSProperties } from 'react'
import {
  assetCssStack,
  focusAssets,
  groundAssets,
  homeAssets,
  lifeMapAssets,
  mirrorAssets,
  passportAssets,
  replayAssets,
  uiAssets,
} from '@/spatial/assets/uraiAssets'

export const dynamic = 'force-static'

const scenes = [
  {
    number: '01',
    eyebrow: 'Real life',
    title: 'Pressure becomes visible.',
    copy: 'Calendar, messages, body context, unfinished decisions, and real-world noise gather at the threshold without becoming a dashboard.',
    asset: homeAssets.primary,
    href: '/home',
  },
  {
    number: '02',
    eyebrow: 'Ground',
    title: 'A private workforce prepares the day.',
    copy: 'Reception, privacy, schedule, wellness, logistics, and memory helpers stage work. The person remains the decision-maker.',
    asset: groundAssets.primary,
    href: '/ground',
  },
  {
    number: '03',
    eyebrow: 'Ascent',
    title: 'Meaning opens above the horizon.',
    copy: 'The camera leaves the operating floor and rises into a private memory galaxy instead of switching to another app screen.',
    asset: homeAssets.accents.skyAscent,
    href: '/ascent',
  },
  {
    number: '04',
    eyebrow: 'Life Map',
    title: 'A life becomes an explorable constellation.',
    copy: 'Memories become stars, chapters become constellations, and the selected thread pulls the field toward Focus.',
    asset: lifeMapAssets.primary,
    href: '/life-map',
  },
  {
    number: '05',
    eyebrow: 'Focus',
    title: 'One memory becomes a chamber.',
    copy: 'Image, title, signal, orb guidance, and one clear doorway isolate the selected memory without losing its place in the world.',
    asset: focusAssets.primary,
    href: '/focus',
  },
  {
    number: '06',
    eyebrow: 'Replay',
    title: 'The memory becomes a film thread.',
    copy: 'The moment, the signal, the world around it, what changed afterward, and what remains unfold as one continuous experience.',
    asset: replayAssets.primary,
    href: '/replay',
  },
  {
    number: '07',
    eyebrow: 'Mirror',
    title: 'The pattern appears without judgment.',
    copy: 'Reflection stays private, permissioned, and useful. The orb helps name the pattern without pretending to own the conclusion.',
    asset: mirrorAssets.primary,
    href: '/mirror',
  },
  {
    number: '08',
    eyebrow: 'Passport',
    title: 'Ownership closes the loop.',
    copy: 'Identity, consent, provenance, export, deletion, and model access remain visible before anything leaves the private world.',
    asset: passportAssets.primary,
    href: '/passport',
  },
] as const

const heroStyle = {
  backgroundImage: assetCssStack(replayAssets.primary),
} as CSSProperties

const orbStyle = {
  backgroundImage: assetCssStack(uiAssets.orbActive),
} as CSSProperties

export default function CutOneReplayFilmPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03020a] text-white" data-launch-surface="cinematic-replay-film-proof">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(167,139,250,.2),transparent_28rem),radial-gradient(circle_at_82%_18%,rgba(56,189,248,.16),transparent_28rem),linear-gradient(180deg,#05020b,#090314_54%,#020106)]" />

      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden px-5 pb-24 pt-28 md:px-10 lg:px-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-55 mix-blend-screen brightness-65 contrast-125 saturate-150" style={heroStyle} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,2,10,.18),rgba(3,2,10,.48)_48%,rgba(3,2,10,.98)),radial-gradient(ellipse_at_55%_42%,transparent_0_24%,rgba(0,0,0,.72)_84%)]" />
        <div className="absolute right-[8vw] top-[12vh] h-44 w-44 bg-contain bg-center bg-no-repeat opacity-70 drop-shadow-[0_0_60px_rgba(125,211,252,.65)] md:h-72 md:w-72" style={orbStyle} />

        <div className="relative z-10 max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[.48em] text-violet-100/75 md:text-xs">URAI · First Replay · Cut One</p>
          <h1 className="mt-5 max-w-[10ch] text-[clamp(4.5rem,12vw,11rem)] font-black leading-[.76] tracking-[-.12em]">Your life is a world.</h1>
          <p className="mt-7 max-w-3xl text-base font-semibold leading-8 text-violet-50/82 md:text-xl md:leading-9">
            A cinematic proof of the complete journey: pressure to portal, Ground to sky, Life Map to Focus, Replay to Mirror, and ownership through Passport.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#film" className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 no-underline transition hover:-translate-y-0.5">Play the proof rail</a>
            <Link href="/home" className="rounded-full border border-white/20 bg-black/35 px-6 py-3 text-sm font-black text-white no-underline backdrop-blur-xl transition hover:bg-white/10">Enter Home</Link>
          </div>
        </div>
      </section>

      <section id="film" className="relative z-10 mx-auto grid max-w-[1600px] gap-5 px-4 py-10 md:px-8 lg:px-10">
        {scenes.map((scene, index) => (
          <Link
            key={scene.number}
            href={scene.href}
            className="group relative isolate min-h-[62svh] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_40px_140px_rgba(0,0,0,.55)] no-underline md:min-h-[72svh] md:rounded-[3rem]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-screen brightness-65 contrast-125 saturate-150 transition duration-1000 group-hover:scale-[1.035] group-hover:opacity-72"
              style={{ backgroundImage: assetCssStack(scene.asset) }}
            />
            <div className={`absolute inset-0 ${index % 2 === 0 ? 'bg-[linear-gradient(90deg,rgba(2,2,10,.98),rgba(2,2,10,.62)_46%,rgba(2,2,10,.18))]' : 'bg-[linear-gradient(270deg,rgba(2,2,10,.98),rgba(2,2,10,.62)_46%,rgba(2,2,10,.18))]'}`} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08),transparent_42%,rgba(0,0,0,.78))]" />

            <article className={`relative z-10 flex min-h-[62svh] max-w-3xl flex-col justify-end p-6 md:min-h-[72svh] md:p-12 lg:p-16 ${index % 2 === 0 ? '' : 'ml-auto'}`}>
              <div className="mb-auto flex items-center justify-between gap-4">
                <span className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-black tracking-[.28em] text-white/80 backdrop-blur-xl">{scene.number}</span>
                <span className="text-[10px] font-black uppercase tracking-[.4em] text-cyan-100/70 md:text-xs">{scene.eyebrow}</span>
              </div>
              <h2 className="max-w-[10ch] text-[clamp(3.4rem,8vw,8rem)] font-black leading-[.8] tracking-[-.1em] text-white">{scene.title}</h2>
              <p className="mt-6 max-w-2xl text-sm font-semibold leading-7 text-slate-100/78 md:text-lg md:leading-8">{scene.copy}</p>
              <span className="mt-7 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition group-hover:bg-white group-hover:text-slate-950">Enter {scene.eyebrow}</span>
            </article>
          </Link>
        ))}
      </section>

      <section className="relative z-10 mx-4 mb-10 overflow-hidden rounded-[2rem] border border-amber-100/15 bg-[#0a0710]/90 px-6 py-16 text-center shadow-[0_40px_140px_rgba(0,0,0,.55)] backdrop-blur-2xl md:mx-8 md:rounded-[3rem] md:px-10 md:py-24 lg:mx-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,.16),transparent_34rem)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[.42em] text-amber-100/70">The layer is open</p>
          <h2 className="mt-5 text-[clamp(4rem,10vw,9rem)] font-black leading-[.78] tracking-[-.11em] text-[#fff7e8]">Create your world.</h2>
          <p className="mx-auto mt-7 max-w-3xl text-base font-semibold leading-8 text-slate-200/78 md:text-xl">
            URAI handles the noise. You live the life. Your memories, relationships, patterns, places, helpers, and permissions become one world you can step inside.
          </p>
          <Link href="/home" className="mt-8 inline-flex rounded-full bg-amber-100 px-7 py-4 text-sm font-black text-slate-950 no-underline transition hover:-translate-y-0.5 hover:bg-white">Create Your World</Link>
        </div>
      </section>
    </main>
  )
}
