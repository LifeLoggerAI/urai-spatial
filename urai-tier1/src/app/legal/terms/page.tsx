import Link from 'next/link'

export const metadata = {
  title: 'UrAi Paid Terms Status',
  description: 'Current status of terms governing paid UrAi purchases.',
}

export default function PaidTermsStatusPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Paid terms status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Paid purchase terms are not yet effective.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi is not accepting live paid checkout from this release-candidate surface. Production purchase terms must be approved and
          published before any customer is asked to pay.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            Before activation, the terms must identify the verified seller and define the purchased product or entitlement, price and currency,
            renewal and cancellation behavior where applicable, refund rules, delivery of digital access, and other terms required for the
            approved offering. Test-mode Stripe objects and smoke values are not production offers.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">This status notice is informational and is not a substitute for the final approved terms.</p>
        <Link className="mt-8 inline-block text-cyan-200 underline underline-offset-4" href="/commerce">Return to commerce readiness</Link>
      </section>
    </main>
  )
}
