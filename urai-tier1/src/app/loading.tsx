export default function Loading() {
  return (
    <main className="tier-one-boundary tier-one-boundary--loading" aria-live="polite" aria-busy="true">
      <section className="tier-one-boundary__card tier-one-boundary__card--loading" role="status" aria-label="URAI Spatial world is becoming interactive">
        <div className="tier-one-boundary__orb" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="tier-one-boundary__eyebrow">URAI Spatial · Home World</p>
        <h1>Own your life. Step inside yourself.</h1>
        <p>
          The Home World is coming online with Life Map, Focus, Replay, Mirror, Passport, Status, and Privacy Controls already wired as one connected spatial memory system.
        </p>
        <nav className="tier-one-boundary__actions" aria-label="URAI launch routes">
          <a href="/life-map">Enter Life Map</a>
          <a href="/focus?memoryId=quiet-reset">Open Focus</a>
          <a href="/replay?manifestId=replay-recovery-thread">Start Replay</a>
          <a href="/passport">Open Passport</a>
          <a href="/status">View Status</a>
        </nav>
        <p className="tier-one-boundary__microcopy">
          Public-safe, private-by-default, Firebase/static-export safe, and ready to keep every route from becoming a dead end.
        </p>
      </section>
    </main>
  )
}
