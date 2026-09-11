import Link from 'next/link'

export const metadata = {
  title: 'UrAi Commerce',
  description: 'UrAi purchase, billing, support, and policy readiness information.',
}

const policyLinks = [
  { href: '/support', label: 'Customer support' },
  { href: '/legal/privacy', label: 'Commerce privacy notice' },
  { href: '/legal/terms', label: 'Terms status' },
  { href: '/legal/refunds', label: 'Refund policy status' },
  { href: '/legal/subscriptions', label: 'Subscription and cancellation status' },
  { href: '/status', label: 'Release status' },
]

export default function CommercePage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Commerce readiness</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Purchases stay off until the terms are real.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi is not accepting live paid checkout from this release-candidate surface. Test-mode catalog objects and smoke values are
          non-production evidence only and are not customer pricing.
        </p>

        <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold">Before live billing can open</h2>
          <p className="mt-3 leading-7 text-slate-300">
            The purchase surface must show the verified seller identity, the exact product and entitlement, price and currency, billing interval,
            renewal behavior, cancellation behavior, refund rules, applicable trial and tax treatment, privacy notice, and customer-support path.
            Live checkout remains fail-closed until those items are approved and the deployed payment path is verified.
          </p>
        </div>

        <nav aria-label="Commerce and policy links" className="mt-10 grid gap-3 sm:grid-cols-2">
          {policyLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-slate-100 transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-10 text-sm leading-6 text-slate-400">Commerce readiness notice reviewed September 11, 2026.</p>
      </section>
    </main>
  )
}
