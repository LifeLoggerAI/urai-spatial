export default function LifeMapLoading() {
  return (
    <main className="tier-one-boundary tier-one-boundary--loading" aria-live="polite" aria-busy="true">
      <section className="tier-one-boundary__card tier-one-boundary__card--loading" role="status" aria-label="URAI Life Map is becoming interactive">
        <div className="tier-one-boundary__orb" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="tier-one-boundary__eyebrow">URAI Spatial · Life Map</p>
        <h1>Your memory constellation is online.</h1>
        <p>
          Thirty-four public-safe stars are staged as an explorable emotional universe. Click any star to open Focus, then move the same thread through Replay, Mirror, Passport, and Status.
        </p>
        <nav className="tier-one-boundary__actions" aria-label="URAI Life Map route shortcuts">
          <a href="/focus?memoryId=quiet-reset">Open Focus</a>
          <a href="/replay?manifestId=replay-recovery-thread">Start Replay</a>
          <a href="/mirror">Mirror</a>
          <a href="/passport">Passport</a>
          <a href="/status">Status</a>
        </nav>
        <p className="tier-one-boundary__microcopy">
          Drag to orbit, wheel to zoom, arrow keys to step stars, and keep a safe return path visible.
        </p>
      </section>
    </main>
  )
}
