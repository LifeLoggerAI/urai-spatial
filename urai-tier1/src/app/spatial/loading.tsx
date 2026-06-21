export default function SpatialLoading() {
  return (
    <main className="tier-one-boundary tier-one-boundary--loading" aria-live="polite" aria-busy="true">
      <section className="tier-one-boundary__card tier-one-boundary__card--loading" role="status" aria-label="URAI Spatial route is becoming interactive">
        <div className="tier-one-boundary__orb" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="tier-one-boundary__eyebrow">URAI Spatial · Route Surface</p>
        <h1>The spatial world is live and connected.</h1>
        <p>
          This route keeps the Home World, Life Map, Focus, Replay, Mirror, Passport, Status, and Privacy Controls in one navigable product surface while the cinematic runtime hydrates.
        </p>
        <nav className="tier-one-boundary__actions" aria-label="URAI spatial route shortcuts">
          <a href="/home">Home</a>
          <a href="/life-map">Life Map</a>
          <a href="/focus?memoryId=quiet-reset">Focus</a>
          <a href="/replay?manifestId=replay-recovery-thread">Replay</a>
          <a href="/status">Status</a>
        </nav>
        <p className="tier-one-boundary__microcopy">
          Every star remains a door. Every scene keeps a return path. No dead-end launch surface.
        </p>
      </section>
    </main>
  )
}
