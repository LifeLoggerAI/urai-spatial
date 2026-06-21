export function LaunchRoutePanel({ variant }: { variant: 'home' | 'life-map' }) {
  const isLifeMap = variant === 'life-map'
  const title = isLifeMap ? 'The constellation is the product surface.' : 'Own your life. Step inside yourself.'
  const lead = isLifeMap
    ? 'Explore the memory constellation, open a selected star in Focus, and continue into Replay.'
    : 'Enter the URAI home world with Life Map, Focus, Replay, Passport, and Status ready.'

  return (
    <section className="urai-route-panel" aria-label="URAI live route controls">
      <article className="urai-route-panel__hero">
        <p className="urai-route-panel__eyebrow">{isLifeMap ? 'Tier Two · Life Map live' : 'Tier One · Home World live'}</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        <nav aria-label="Primary route actions">
          <a href={isLifeMap ? '/focus?memoryId=quiet-reset' : '/life-map'}>{isLifeMap ? 'Open selected memory' : 'Open Life Map'}</a>
          <a href="/focus?memoryId=quiet-reset">Focus</a>
          <a href="/replay?manifestId=replay-recovery-thread">Replay</a>
          <a href="/passport">Passport</a>
          <a href="/status">Status</a>
        </nav>
      </article>
      <aside className="urai-route-panel__rail" aria-label="Route readiness notes">
        <p><strong>Live route</strong><br />Controls stay usable before and after the 3D canvas hydrates.</p>
        <p><strong>No dead end</strong><br />Every primary action moves into another real URAI route.</p>
        <p><strong>Public-safe</strong><br />The surface explains the product without exposing private user data.</p>
      </aside>
    </section>
  )
}
