const launchDestinations = [
  ['/login', 'Enter your private world', 'Sign in or create your UrAi identity.'],
  ['/life-map', 'Life Map', 'Navigate your private memories, people, places, and chapters.'],
  ['/life-movie', 'Life Movie', 'Play a private cinematic sequence assembled from your authorized memories.'],
  ['/council', 'Council', 'Enter the embodied Council chamber and use the live consented provider path.'],
  ['/xr', 'XR', 'Open the WebXR entry chamber with desktop and mobile fallbacks.'],
  ['/passport', 'Passport', 'Inspect ownership, permissions, exports, deletion, providers, and receipts.'],
  ['/privacy-controls', 'Privacy controls', 'Grant, narrow, pause, revoke, and audit consent.'],
] as const

export const metadata = {
  title: 'UrAi Launch',
  description: 'Enter the production UrAi experience and its private spatial launch surfaces.',
}

export default function LaunchPage() {
  return (
    <main className="launchHub" aria-labelledby="launch-heading">
      <section className="launchHero">
        <p><span>URAI</span> · LAUNCH</p>
        <h1 id="launch-heading">Your private world is the interface.</h1>
        <p>
          UrAi connects Home, Life Map, Replay, Life Movie, Council, XR, Passport, and privacy controls
          through one spatial experience. Private capabilities remain protected by authentication,
          consent, ownership, device capability, and release-integrity checks.
        </p>
        <div className="launchActions">
          <a href="/login">Enter UrAi</a>
          <a href="/demo">Open disclosed demo</a>
        </div>
      </section>

      <section aria-labelledby="launch-destinations">
        <h2 id="launch-destinations">Launch destinations</h2>
        <div className="launchGrid">
          {launchDestinations.map(([href, title, detail]) => (
            <a key={href} href={href}>
              <strong>{title}</strong>
              <span>{detail}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="launchTruth" aria-labelledby="launch-truth">
        <h2 id="launch-truth">Launch truth</h2>
        <p>
          Public and private experiences are intentionally distinct. This demo uses sample data where explicitly labeled.
          Production-certification pending until exact live receipts are complete. Signed-in experiences use owner-authorized
          data and fail closed when identity, consent, provider, device, or release requirements are not satisfied.
          UrAi does not diagnose or decide what a life means, and this experience does not prove persistent personal memory.
        </p>
      </section>

      <style>{`
        .launchHub{min-height:100svh;box-sizing:border-box;padding:clamp(24px,5vw,72px);display:grid;gap:54px;background:radial-gradient(circle at 50% 8%,#173342 0,#071319 34%,#020608 78%);color:#f5fbf8;font-family:Inter,ui-sans-serif,system-ui}.launchHero{max-width:920px}.launchHero>p:first-child{margin:0;color:#9ee9ff;font-size:11px;font-weight:900;letter-spacing:.28em}.launchHero h1{margin:12px 0 18px;font:500 clamp(3rem,9vw,8rem)/.86 Georgia,serif}.launchHero>p:not(:first-child),.launchTruth p{max-width:74ch;color:#c7d7da;font-size:clamp(1rem,2vw,1.2rem);line-height:1.65}.launchActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}.launchActions a,.launchGrid a{min-height:48px;border:1px solid rgba(220,250,255,.2);border-radius:999px;color:#fff;text-decoration:none}.launchActions a{display:grid;place-items:center;padding:0 20px}.launchActions a:first-child{background:#f5fbf8;color:#071319;font-weight:900}.launchHub h2{font-size:clamp(1.5rem,3vw,2.4rem)}.launchGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.launchGrid a{display:grid;align-content:center;gap:6px;padding:18px;border-radius:22px;background:rgba(255,255,255,.045)}.launchGrid strong{font-size:1rem}.launchGrid span{color:#aabdc2;font-size:.88rem;line-height:1.45}.launchTruth{max-width:920px;border-top:1px solid rgba(255,255,255,.12);padding-top:24px}.launchHub a:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(prefers-reduced-motion:reduce){.launchHub *{animation:none!important;transition:none!important}}@media(forced-colors:active){.launchActions a,.launchGrid a{border:2px solid CanvasText}}
      `}</style>
    </main>
  )
}
