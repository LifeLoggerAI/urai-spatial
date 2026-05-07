"use client"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="tier-one-boundary" role="alert">
      <section className="tier-one-boundary__card">
        <p className="tier-one-boundary__eyebrow">URAI Spatial</p>
        <h1>The spatial field could not open.</h1>
        <p>{error?.message || "A recoverable runtime error interrupted the scene."}</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  )
}
