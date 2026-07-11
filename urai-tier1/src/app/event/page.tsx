import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'URAI Founder Demo',
  description: 'A sample-data founder walkthrough of the current URAI spatial experience.',
}

const demoSteps = [
  ['Home', 'Enter a private spatial world organized around a life, not a feed.'],
  ['Life Map', 'See synthetic memories, relationships, goals, and chapters as a connected map.'],
  ['Focus', 'Bring one sample memory forward without losing its place in the larger story.'],
  ['Replay', 'See the source-aware narrative direction without claiming live private persistence.'],
] as const

export default function FounderEventPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      aria-labelledby="event-heading"
      data-testid="urai-founder-event-destination"
      data-demo-data="synthetic-sample-only"
      data-production-certification="pending-exact-deployment-proof"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(192,132,252,0.20),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/65 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-11">
            <p className="text-xs font-black uppercase tracking-[0.38em] text-cyan-200">URAI · Founder Event Demo</p>
            <h1 id="event-heading" className="mt-4 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.07em] md:text-7xl">
              Your life should not look like a dashboard.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-200/85">
              URAI is building a private spatial interface for memory, identity, reflection, focus, and personal direction.
            </p>
            <div className="mt-7 rounded-2xl border border-amber-200/25 bg-amber-200/[0.08] p-5 text-sm font-semibold leading-7 text-amber-50/95">
              <strong className="block text-amber-100">Sample-data demonstration</strong>
              This destination and the linked walkthrough use synthetic sample content only. They do not show customer records, private accounts, credentials, admin tools, console output, environment values, or production data. Production certification and exact deployed-SHA proof remain pending until the Status page and release receipts confirm them.
            </div>
            <nav className="mt-7 flex flex-wrap gap-3" aria-label="Founder demo actions">
              <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/life-map">Open the sample Life Map</Link>
              <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/status">Check current status</Link>
              <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/privacy-controls">Review privacy controls</Link>
            </nav>
          </article>

          <aside className="rounded-[2rem] border border-cyan-100/15 bg-white/[0.05] p-7 text-center shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
            <Image className="mx-auto rounded-2xl bg-white p-4" src="/media/event/urai-event-qr.svg" width={288} height={288} alt="QR code for https://urai.app/event" priority />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Event destination</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-200">https://urai.app/event</p>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">Publish this QR only after the exact deployed SHA is visible on the live Status surface and the custom-domain smoke passes.</p>
          </aside>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/58 p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-violet-200">One-minute path</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {demoSteps.map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <span className="text-xs font-black text-cyan-200">0{index + 1}</span>
                <h2 className="mt-2 text-xl font-black">{title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7">
            <h2 className="text-2xl font-black">What is demonstrable now</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">A substantial fallback-safe spatial web experience using synthetic sample data, with source-implemented Home, Life Map, Focus, Replay, Mirror, Passport, privacy, and evidence surfaces.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7">
            <h2 className="text-2xl font-black">What is not claimed</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">This demonstration does not prove persistent private memory, provider activation, physical-device certification, medical diagnosis, surveillance, autonomous real-world action, or completed production certification.</p>
          </article>
        </section>
      </div>
    </main>
  )
}
