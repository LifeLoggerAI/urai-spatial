import Link from 'next/link'

export const metadata = {
  title: 'About URAI Spatial',
  description: 'Canonical product identity, repository authority, public route map, and evidence boundaries for URAI Spatial.',
  alternates: {
    canonical: 'https://urai.app/about',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'URAI Spatial',
  alternateName: 'URAI',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: 'https://urai.app',
  codeRepository: 'https://github.com/LifeLoggerAI/urai-spatial',
  description: 'A spatial web experience for memory, identity, reflection, focus, and personal direction.',
  isAccessibleForFree: true,
}

export default function AboutPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      aria-labelledby="about-heading"
      data-testid="urai-public-product-identity"
      data-identity-scope="product-not-legal-entity"
      data-production-certification="pending-exact-deployment-proof"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(192,132,252,0.20),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <section className="relative z-10 mx-auto max-w-5xl rounded-[2rem] border border-cyan-100/15 bg-slate-950/65 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-11">
        <p className="text-xs font-black uppercase tracking-[0.38em] text-cyan-200">Canonical Product Identity</p>
        <h1 id="about-heading" className="mt-4 text-5xl font-black leading-[0.9] tracking-[-0.07em] md:text-7xl">URAI Spatial</h1>
        <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-200/85">
          URAI is building a spatial operating system for memory, identity, reflection, focus, and personal direction. The current repository contains a substantial fallback-safe web experience that can be demonstrated with synthetic sample data.
        </p>

        <div className="mt-7 rounded-2xl border border-amber-200/25 bg-amber-200/[0.08] p-5 text-sm font-semibold leading-7 text-amber-50/95">
          <strong className="block text-amber-100">Evidence boundary</strong>
          This page identifies the product and canonical public repository. It does not assert a legal entity, creator, founder, trademark owner, patent owner, copyright owner, or chain of title. Those statements require authorized corporate records and appropriate review. Production certification, authenticated persistence, active providers, and physical-device certification remain separately receipt-gated.
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-xl font-black">Canonical public application</h2>
            <p className="mt-2 break-all font-mono text-sm text-cyan-100">https://urai.app</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-xl font-black">Canonical public repository</h2>
            <p className="mt-2 break-all font-mono text-sm text-cyan-100">LifeLoggerAI/urai-spatial</p>
          </article>
        </div>

        <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.045] p-6">
          <h2 className="text-2xl font-black">Public product path</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">Home → Ground → Life Map → Focus → Replay → Mirror → Passport → Status</p>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">Implemented source surfaces are not automatically production-certified. Status and exact release receipts remain the authority for what may be claimed live.</p>
        </section>

        <nav className="mt-7 flex flex-wrap gap-3" aria-label="Product identity navigation">
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">Open Home</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/status">Review Status</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/privacy-controls">Privacy Controls</Link>
          <a className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="https://github.com/LifeLoggerAI/urai-spatial">Open repository</a>
        </nav>
      </section>
    </main>
  )
}
