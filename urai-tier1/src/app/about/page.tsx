import Link from 'next/link'

export const metadata = {
  title: 'About UrAi',
  description: 'UrAi is a privacy-first adaptive life runtime that turns personal signals into an explorable spatial world owned by the person living it.',
  alternates: { canonical: 'https://urai.app/about/' },
  openGraph: {
    title: 'About UrAi',
    description: 'A privacy-first adaptive life runtime for memory, focus, reflection, and personal direction.',
    url: 'https://urai.app/about/',
    siteName: 'UrAi',
    type: 'website',
  },
}

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://urai.app/#organization',
  name: 'URAI Labs',
  url: 'https://urai.app/',
  founder: { '@id': 'https://urai.app/about/#adam-clamp' },
}

const founder = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://urai.app/about/#adam-clamp',
  name: 'Adam Clamp',
  jobTitle: 'Founder, Steward and System Architect',
  worksFor: { '@id': 'https://urai.app/#organization' },
}

const product = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://urai.app/#software',
  name: 'UrAi',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: 'https://urai.app/',
  description: 'A privacy-first adaptive life runtime that turns personal signals into an explorable spatial world.',
  author: { '@id': 'https://urai.app/#organization' },
}

const engineer = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://urai.app/about/#chris-herrin',
  name: 'Chris Herrin',
  jobTitle: 'Founding Engineer, URAI Labs',
  worksFor: { '@id': 'https://urai.app/#organization' },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-6 py-14 text-white md:px-10">
      {[organization, founder, product, engineer].map((item) => (
        <script
          key={item['@id']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
      <section className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/80">UrAi · About</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Your life, as a world you can explore.</h1>
          <p className="text-lg leading-8 text-slate-200">
            UrAi is a privacy-first adaptive life runtime. It turns permissioned personal signals into a spatial world for memory, focus, reflection, replay, and personal direction rather than treating a person as a feed of prompts.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-lg font-semibold">Personal by design</h2>
            <p className="mt-3 leading-7 text-slate-300">The experience is organized around the person: Home, Ground, Life Map, Focus, Replay, Mirror, Passport, and the transitions that connect them.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-lg font-semibold">Privacy is a boundary</h2>
            <p className="mt-3 leading-7 text-slate-300">Sensitive capabilities stay permissioned and fail closed. Public status and privacy surfaces describe what is actually available instead of inventing provider or account authority.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-lg font-semibold">Spatial, not conversational-only</h2>
            <p className="mt-3 leading-7 text-slate-300">Camera travel, terrain, light, memory geography, thresholds, and accessible interaction turn life context into a navigable environment.</p>
          </article>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 md:p-9" aria-labelledby="people-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">People</p>
          <h2 id="people-heading" className="mt-3 text-2xl font-semibold">Stewardship and engineering</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div><h3 className="font-semibold">Adam Clamp</h3><p className="mt-2 text-slate-300">Founder, Steward and System Architect.</p></div>
            <div><h3 className="font-semibold">Chris Herrin</h3><p className="mt-2 text-slate-300">Founding Engineer, URAI Labs.</p></div>
          </div>
        </section>

        <nav className="flex flex-wrap gap-3" aria-label="About UrAi next steps">
          <Link href="/home" className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-5 py-3 font-medium text-cyan-50">Enter Home</Link>
          <Link href="/privacy-controls" className="rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100">Privacy controls</Link>
          <Link href="/status" className="rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100">System status</Link>
          <Link href="/launch" className="rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100">Launch</Link>
        </nav>
      </section>
    </main>
  )
}
