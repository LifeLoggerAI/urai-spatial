import Link from 'next/link'

export const metadata = {
  title: 'UrAi Refund Policy Status',
  description: 'Current status of UrAi refund rules before live billing activation.',
}

export default function RefundPolicyStatusPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Refund policy status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">No live paid purchases are currently offered here.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          Because live customer billing is still disabled, this release-candidate surface is not publishing an invented refund promise.
          The final refund policy must be approved, published, and linked from the purchase flow before live checkout is enabled.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            Any final policy must state the eligibility rules, request method, applicable timing, exclusions if lawful and approved, and how
            subscription cancellation differs from a refund. Until that authority exists, test-mode transactions remain synthetic evidence only.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">This status notice does not create customer refund terms.</p>
        <Link className="mt-8 inline-block text-cyan-200 underline underline-offset-4" href="/commerce">Return to commerce readiness</Link>
      </section>
    </main>
  )
}
