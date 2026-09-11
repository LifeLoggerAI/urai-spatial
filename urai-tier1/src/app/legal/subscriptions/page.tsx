import Link from 'next/link'

export const metadata = {
  title: 'UrAi Subscription Policy Status',
  description: 'Current status of UrAi subscription and cancellation rules before live billing activation.',
}

export default function SubscriptionPolicyStatusPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Subscription status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Live subscriptions remain disabled.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi has test-mode subscription objects for integration verification, but they are not public offers and do not define production pricing,
          renewal, cancellation, downgrade, or trial terms.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            Before live subscriptions open, the purchase flow must clearly state the approved price and currency, billing interval, renewal behavior,
            cancellation timing and effect, downgrade behavior, trial terms if any, refund relationship, taxes where applicable, and the authenticated
            customer-management path.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">No recurring charge is authorized by this status page.</p>
        <Link className="mt-8 inline-block text-cyan-200 underline underline-offset-4" href="/commerce">Return to commerce readiness</Link>
      </section>
    </main>
  )
}
