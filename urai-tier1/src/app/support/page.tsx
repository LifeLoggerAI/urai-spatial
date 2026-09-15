import Link from 'next/link'

export const metadata = {
  title: 'UrAi Customer Support',
  description: 'Customer-support readiness for UrAi before live billing activation.',
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-12 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Customer support</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Live purchase support is not active yet.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-200">
          UrAi is not accepting live paid checkout from this release-candidate surface. A production support receiving route has not yet been positively
          verified, so this readiness page does not publish an email address or imply that paid-service support intake is live.
        </p>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-slate-300">
          <p>
            Before live billing opens, the support process must provide a verified receiving route and cover billing questions, cancellation and refund
            requests under the final published policies, account-access issues, and privacy requests.
          </p>
          <p className="mt-4">
            No response-time, refund outcome, support phone number, or service-level commitment is represented by this readiness page. Do not send
            passwords, payment credentials, recovery codes, government ID images, full bank or card numbers, or other secrets through unverified channels.
          </p>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-400">
          Live paid checkout remains disabled until the full commerce policy, verified support intake, and provider path are approved and verified.
        </p>
        <Link className="mt-8 inline-block text-cyan-200 underline underline-offset-4" href="/commerce">Return to commerce readiness</Link>
      </section>
    </main>
  )
}
