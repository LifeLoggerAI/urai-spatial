import Link from 'next/link'

export const metadata = {
  title: 'UrAi Pricing Status',
  description: 'Current status of UrAi production pricing before live billing activation.',
}

export default function PricingStatusPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Pricing status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Production prices are not published yet.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi has Stripe TEST-mode smoke prices used only to verify integration behavior. Those values are not customer pricing and must never be
          presented as a production offer.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            Before live checkout opens, each offered plan must have an approved entitlement definition, price, currency, billing interval, renewal and
            cancellation behavior, refund relationship, trial terms if any, and applicable tax treatment. The public purchase surface must match the
            exact live Stripe catalog.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">No production price or paid entitlement is authorized by this page.</p>
        <Link className="mt-8 inline-block text-cyan-200 underline underline-offset-4" href="/commerce">Return to commerce readiness</Link>
      </section>
    </main>
  )
}
