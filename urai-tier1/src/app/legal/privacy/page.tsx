import Link from 'next/link'

export const metadata = {
  title: 'UrAi Commerce Privacy Status',
  description: 'Privacy status for UrAi commerce and billing readiness.',
}

export default function CommercePrivacyStatusPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Commerce privacy status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Billing must not expand access to personal life data.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi keeps product privacy controls separate from payment processing. Live billing remains disabled while the final commerce privacy notice,
          seller identity, and production purchase terms are still under release governance.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            The final commerce notice must accurately describe payment-provider processing and any billing records needed to deliver purchased access,
            without implying that payment grants broader permission to read, infer from, sell, or otherwise use private UrAi memory or context data.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">
          For current in-product consent and data controls, use the existing privacy surfaces. This page is a release-status notice, not final legal text.
        </p>
        <div className="mt-8 flex flex-wrap gap-5">
          <Link className="text-cyan-200 underline underline-offset-4" href="/privacy">Product privacy</Link>
          <Link className="text-cyan-200 underline underline-offset-4" href="/privacy-controls">Privacy controls</Link>
          <Link className="text-cyan-200 underline underline-offset-4" href="/commerce">Commerce readiness</Link>
        </div>
      </section>
    </main>
  )
}
