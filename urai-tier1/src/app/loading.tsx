export default function Loading() {
  return (
    <main className="tier-one-boundary tier-one-boundary--loading" aria-live="polite" aria-busy="true">
      <section className="tier-one-boundary__card tier-one-boundary__card--loading" role="status" aria-label="URAI Spatial is opening">
        <div className="tier-one-boundary__orb" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="tier-one-boundary__eyebrow">URAI Spatial</p>
        <h1>Opening your spatial field</h1>
        <p>
          Preparing the scene, memory map, and safe return paths. This usually takes only a moment.
        </p>
        <div className="tier-one-boundary__progress" aria-hidden="true">
          <span />
        </div>
        <p className="tier-one-boundary__microcopy">
          If the field does not open, refresh once. Your private memory data stays protected.
        </p>
      </section>
    </main>
  )
}
