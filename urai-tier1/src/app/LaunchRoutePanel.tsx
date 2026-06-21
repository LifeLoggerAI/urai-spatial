import styles from './LaunchRoutePanel.module.css'

type LaunchRouteVariant = 'home' | 'life-map' | 'focus' | 'replay'

type RoutePanelCopy = {
  eyebrow: string
  title: string
  lead: string
  primaryHref: string
  primaryLabel: string
  primaryAction: string
}

const copyByVariant: Record<LaunchRouteVariant, RoutePanelCopy> = {
  home: {
    eyebrow: 'Tier One · Home World live',
    title: 'Own your life. Step inside yourself.',
    lead: 'Enter the URAI home world with Life Map, Focus, Replay, Passport, and Status ready.',
    primaryHref: '/life-map',
    primaryLabel: 'Open Life Map',
    primaryAction: 'home-life-map',
  },
  'life-map': {
    eyebrow: 'Tier Two · Life Map live',
    title: 'The constellation is the product surface.',
    lead: 'Explore the memory constellation, open a selected star in Focus, and continue into Replay.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Open selected memory',
    primaryAction: 'life-map-focus',
  },
  focus: {
    eyebrow: 'Tier Two · Focus live',
    title: 'Focus is the bridge into Replay.',
    lead: 'Stay with one memory, then continue into the replay thread without hitting a hidden or dead route.',
    primaryHref: '/replay?manifestId=replay-recovery-thread',
    primaryLabel: 'Continue into Replay',
    primaryAction: 'focus-replay',
  },
  replay: {
    eyebrow: 'Tier Two · Replay live',
    title: 'Replay turns memory into a guided thread.',
    lead: 'Move through a cinematic replay path, then return to Focus, Life Map, or Home without losing the thread.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Back to Focus',
    primaryAction: 'replay-focus',
  },
}

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  const copy = copyByVariant[variant]

  return (
    <section className={styles.panel} aria-label="URAI live route controls">
      <article className={styles.hero}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
        <nav className={styles.actions} aria-label="Primary route actions">
          <a data-urai-audit-action={copy.primaryAction} href={copy.primaryHref}>{copy.primaryLabel}</a>
          <a data-urai-audit-action="open-life-map" href="/life-map">Life Map</a>
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
