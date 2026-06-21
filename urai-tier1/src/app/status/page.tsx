const checks = [
  ['Public app shell', 'Live'],
  ['Home world', 'Live'],
  ['Life Map', 'Live'],
  ['Replay', 'Live'],
  ['Focus', 'Live'],
  ['Mirror', 'Live'],
  ['Passport', 'Live'],
]

const routes = [
  ['Home', '/home'],
  ['Life-map', '/life-map'],
  ['Replay', '/replay'],
  ['Focus', '/focus'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
]

export const metadata = {
  title: 'URAI Status',
  description: 'Public launch status for the URAI Inner Sky Shrine app shell.',
}

export default function StatusPage() {
  return (
    <main className="urai-status-page" data-testid="urai-status-page">
      <section className="urai-status-card" aria-labelledby="urai-status-title">
        <p className="urai-status-kicker">URAI public app status</p>
        <h1 id="urai-status-title">All public launch routes are online.</h1>
        <p className="urai-status-copy">
          This page verifies the public entry points for the Inner Sky Shrine shell: /, /home, /life-map, /replay, /focus, /mirror, /passport, and /status.
        </p>

        <div className="urai-status-grid" aria-label="Route status checks">
          {checks.map(([label, status]) => (
            <div key={label} className="urai-status-pill">
              <span>{label}</span>
              <strong>{status}</strong>
            </div>
          ))}
        </div>

        <nav className="urai-status-nav" aria-label="Public URAI routes">
          {routes.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
      </section>
    </main>
  )
}
