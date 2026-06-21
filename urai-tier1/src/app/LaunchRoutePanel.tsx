import styles from './LaunchRoutePanel.module.css'

type LaunchRouteVariant = 'home' | 'life-map' | 'focus'

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  const isLifeMap = variant === 'life-map'
  const isFocus = variant === 'focus'
  const title = isLifeMap
    ? 'The constellation is the product surface.'
    : isFocus
      ? 'Focus is the bridge into Replay.'
      : 'Own your life. Step inside yourself.'
  const lead = isLifeMap
    ? 'Explore the memory constellation, open a selected star in Focus, and continue into Replay.'
    : isFocus
      ? 'Stay with one memory, then continue into the replay thread without hitting a hidden or dead route.'
      : 'Enter the URAI home world with Life Map, Focus, Replay, Passport, and Status ready.'
  const primaryHref = isLifeMap
    ? '/focus?memoryId=quiet-reset'
    : isFocus
      ? '/replay?manifestId=replay-recovery-thread'
      : '/life-map'
  const primaryLabel = isLifeMap ? 'Open selected memory' : isFocus ? 'Continue into Replay' : 'Open Life Map'
  const primaryAction = isLifeMap ? 'life-map-focus' : isFocus ? 'focus-replay' : 'home-life-map'

  return (
    <section className={styles.panel} aria-label="URAI live route controls">
      <article className={styles.hero}>
        <p className={styles.eyebrow}>{isLifeMap ? 'Tier Two · Life Map live' : isFocus ? 'Tier Two · Focus live' : 'Tier One · Home World live'}</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        <nav className={styles.actions} aria-label="Primary route actions">
          <a data-urai-audit-action={primaryAction} href={primaryHref}>{primaryLabel}</a>
          <a data-urai-audit-action="open-focus" href="/focus?memoryId=quiet-reset">Focus</a>
          <a data-urai-audit-action="open-replay" href="/replay?manifestId=replay-recovery-thread">Replay</a>
          <a data-urai-audit-action="open-passport" href="/passport">Passport</a>
          <a data-urai-audit-action="open-status" href="/status">Status</a>
        </nav>
      </article>
      <aside className={styles.rail} aria-label="Route readiness notes">
        <p><strong>Live route</strong><br />Controls stay usable before and after the 3D canvas hydrates.</p>
        <p><strong>No dead end</strong><br />Every primary action moves into another real URAI route.</p>
        <p><strong>Public-safe</strong><br />The surface explains the product without exposing private user data.</p>
      </aside>
    </section>
  )
}
