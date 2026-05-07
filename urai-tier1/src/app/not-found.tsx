import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="tier-one-boundary">
      <section className="tier-one-boundary__card">
        <p className="tier-one-boundary__eyebrow">URAI Spatial</p>
        <h1>This spatial route does not exist.</h1>
        <p>Return to the Home field and begin the ascent again.</p>
        <Link href="/" className="tier-one-boundary__link">Return home</Link>
      </section>
    </main>
  )
}
