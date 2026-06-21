export function LaunchSeo({ label }: { label: string }) {
  return (
    <section className="urai-launch-fallback" data-testid="urai-launch-fallback" aria-label="URAI production launch fallback">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .urai-launch-fallback {
              min-height: 100svh;
              display: grid;
              place-items: center;
              padding: clamp(22px, 5vw, 70px);
              color: #eef6ff;
              background:
                radial-gradient(circle at 18% 14%, rgba(125, 211, 252, 0.24), transparent 30rem),
                radial-gradient(circle at 82% 12%, rgba(168, 85, 247, 0.2), transparent 30rem),
                linear-gradient(150deg, #020617, #071126 52%, #0f172a);
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            html[data-urai-runtime-ready="true"] .urai-launch-fallback { display: none !important; }
            .urai-launch-fallback-card {
              width: min(1180px, 100%);
              border: 1px solid rgba(186, 230, 253, .28);
              border-radius: 34px;
              padding: clamp(24px, 5vw, 62px);
              background: linear-gradient(145deg, rgba(2, 6, 23, .9), rgba(15, 23, 42, .66));
              box-shadow: 0 34px 140px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08);
            }
            .urai-launch-eyebrow, .urai-launch-route-grid span {
              color: #67e8f9;
              letter-spacing: .18em;
              text-transform: uppercase;
              font-size: .74rem;
              font-weight: 900;
            }
            .urai-launch-fallback h1 {
              margin: 14px 0 18px;
              max-width: 12ch;
              font-size: clamp(2.5rem, 7vw, 6.8rem);
              line-height: .88;
              letter-spacing: -.08em;
            }
            .urai-launch-fallback p {
              max-width: 76ch;
              color: rgba(238, 246, 255, .78);
              font-size: clamp(1rem, 1.35vw, 1.16rem);
              line-height: 1.65;
            }
            .urai-launch-route-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
              gap: 12px;
              margin-top: 30px;
            }
            .urai-launch-route-grid a {
              display: grid;
              gap: 8px;
              min-height: 132px;
              padding: 18px;
              border-radius: 24px;
              border: 1px solid rgba(226,232,240,.14);
              background: rgba(2, 6, 23, .48);
              color: #eef6ff;
              text-decoration: none;
              box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
            }
            .urai-launch-route-grid a:hover, .urai-launch-route-grid a:focus-visible {
              border-color: rgba(103,232,249,.55);
              background: rgba(15, 23, 42, .72);
              outline: none;
            }
            .urai-launch-route-grid small { color: rgba(238,246,255,.68); line-height: 1.45; }
          `,
        }}
      />
      <article className="urai-launch-fallback-card">
        <p className="urai-launch-eyebrow">URAI Spatial · Production live surface</p>
        <h1>{label}</h1>
        <p>
          URAI is a connected spatial memory world with Home, Life Map, Focus, Replay, Mirror, Passport,
          and Status wired as one launch-ready product.
        </p>
        <p>
          The hydrated route renders the cinematic three dimensional world. This static fallback keeps crawlers,
          no-JavaScript browsers, screenshots, and static-export hosts premium and navigable.
        </p>
        <nav aria-label="URAI production routes" className="urai-launch-route-grid">
          <a href="/home"><span>Tier One</span><strong>Home World</strong><small>Ground, orb, sky, avatar, camera, and route actions.</small></a>
          <a href="/life-map"><span>Tier Two</span><strong>Life Map</strong><small>Explorable memory constellation wired into Focus.</small></a>
          <a href="/focus?memoryId=quiet-reset"><span>Tier Two</span><strong>Focus</strong><small>Selected memory review from the constellation.</small></a>
          <a href="/replay?manifestId=replay-recovery-thread"><span>Tier Two</span><strong>Replay</strong><small>Guided replay path and return flow.</small></a>
          <a href="/mirror"><span>Tier Three</span><strong>Mirror</strong><small>Reflection surface connected to the spatial runtime.</small></a>
          <a href="/passport"><span>Trust</span><strong>Passport</strong><small>Identity, provenance, consent, and access.</small></a>
          <a href="/status"><span>Ops</span><strong>Status</strong><small>Static export, route readiness, and launch proof.</small></a>
        </nav>
      </article>
    </section>
  )
}
