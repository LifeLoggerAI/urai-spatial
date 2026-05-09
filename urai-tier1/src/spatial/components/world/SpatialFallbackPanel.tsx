export default function SpatialFallbackPanel({ reason = 'WebGL is unavailable or still loading.' }: { reason?: string }) {
  return (
    <section className="spatial-fallback-panel" data-testid="spatial-fallback-panel" aria-label="URAI Spatial fallback">
      <div className="spatial-fallback-panel__orb" aria-hidden="true" />
      <p className="spatial-fallback-panel__eyebrow">URAI Spatial</p>
      <h1>Local demo memory map</h1>
      <p>{reason}</p>
      <p className="spatial-fallback-panel__truth">Demo data only. No live AR, VR, biometric, wearable, or Firebase memory grounding is active in this view.</p>
    </section>
  )
}
