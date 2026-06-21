import styles from './LaunchRoutePanel.module.css'

type LaunchRouteVariant = 'home' | 'life-map' | 'focus' | 'replay'

type RoutePanelCopy = {
  eyebrow: string
  title: string
  lead: string
  primaryHref: string
  primaryLabel: string
  primaryAction: string
  signature: string
}

type LaunchRoute = {
  label: string
  href: string
  action: string
  kicker: string
  detail: string
}

const copyByVariant: Record<LaunchRouteVariant, RoutePanelCopy> = {
  home: {
    eyebrow: 'Home World · live spatial surface',
    title: 'Own your life. Step inside yourself.',
    lead: 'URAI opens as a living world: your memories become stars, Focus holds one signal steady, Replay turns a thread cinematic, and Passport keeps identity, consent, and provenance visible without taking ownership of your story.',
    primaryHref: '/life-map',
    primaryLabel: 'Enter Life Map',
    primaryAction: 'home-life-map',
    signature: 'Memory · Mood · Place · Replay · Passport',
  },
  'life-map': {
    eyebrow: 'Life Map · constellation live',
    title: 'Stars are doors into your world.',
    lead: 'Explore the memory constellation, open a selected star in Focus, and continue into Replay without losing the thread or landing on a dead route.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Open selected memory',
    primaryAction: 'life-map-focus',
    signature: 'Constellation · Focus · Replay',
  },
  focus: {
    eyebrow: 'Focus · selected memory live',
    title: 'Stay with one signal.',
    lead: 'Focus keeps one memory stable, readable, and ready to replay while privacy, exit paths, and route controls stay visible.',
    primaryHref: '/replay?manifestId=replay-recovery-thread',
    primaryLabel: 'Continue into Replay',
    primaryAction: 'focus-replay',
    signature: 'Signal · Chamber · Thread',
  },
  replay: {
    eyebrow: 'Replay · cinematic thread live',
    title: 'Replay turns memory into motion.',
    lead: 'Move through a guided replay path, then return to Focus, Life Map, Passport, or Home without breaking the spatial thread.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Back to Focus',
    primaryAction: 'replay-focus',
    signature: 'Motion · Meaning · Return',
  },
}

const launchRoutes: LaunchRoute[] = [
  { label: 'Life Map', href: '/life-map', action: 'open-life-map', kicker: 'Universe', detail: 'Open the living memory constellation.' },
  { label: 'Focus', href: '/focus?memoryId=quiet-reset', action: 'open-focus', kicker: 'Signal', detail: 'Hold one memory chamber steady.' },
  { label: 'Replay', href: '/replay?manifestId=replay-recovery-thread', action: 'open-replay', kicker: 'Cinema', detail: 'Move through the thread in time.' },
  { label: 'Mirror', href: '/mirror', action: 'open-mirror', kicker: 'Reflection', detail: 'See the pattern without leaving the world.' },
  { label: 'Passport', href: '/passport', action: 'open-passport', kicker: 'Identity', detail: 'Review consent, provenance, and ownership.' },
  { label: 'Status', href: '/status', action: 'open-status', kicker: 'Health', detail: 'Confirm launch readiness and route uptime.' },
  { label: 'Privacy', href: '/privacy-controls', action: 'open-privacy-controls', kicker: 'Control', detail: 'Choose what stays private before anything expands.' },
]

const proofSignals = ['Private by default', 'Real route chain', 'Static-export safe']
const orbitStats = [
  { value: '01', label: 'World entry' },
  { value: '07', label: 'Live paths' },
  { value: '∞', label: 'Memory space' },
]

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  const copy = copyByVariant[variant]
  const [lifeMap, focus, replay, mirror, passport, status, privacy] = launchRoutes

  return (
    <section className={styles.shell} data-route-panel-variant={variant} aria-label="URAI Spatial home world launch controls">
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.constellation} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <article className={styles.heroStage}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>

          <div className={styles.signature} aria-label="URAI spatial layers">
            {copy.signature}
          </div>

          <div className={styles.proofStrip} role="list" aria-label="Launch guarantees">
            {proofSignals.map((signal) => (
              <span key={signal} role="listitem">{signal}</span>
            ))}
          </div>
        </div>

        <a className={styles.orbGateway} href={copy.primaryHref} data-urai-audit-action={copy.primaryAction} aria-label={`${copy.primaryLabel}: ${lifeMap.detail}`}>
          <span className={styles.orbHalo} aria-hidden="true" />
          <span className={styles.orbCore} aria-hidden="true" />
          <span className={styles.orbText}>
            <strong>{copy.primaryLabel}</strong>
            <span>{lifeMap.detail}</span>
          </span>
        </a>
      </article>

      <nav className={styles.routeDock} aria-label="Primary URAI routes">
        {[lifeMap, focus, replay, mirror, passport, status].map((route) => (
          <a key={route.action} href={route.href} data-urai-audit-action={route.action}>
            <span>{route.kicker}</span>
            <strong>{route.label}</strong>
            <em>{route.detail}</em>
          </a>
        ))}
      </nav>

      <aside className={styles.worldPanel} aria-label="URAI world state">
        <div className={styles.panelHeader}>
          <span>URAI Spatial</span>
          <strong>Home world online</strong>
        </div>
        <div className={styles.orbitStats} aria-label="Launch surface summary">
          {orbitStats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <p>Start in Life Map, open Focus, continue Replay, then keep consent and route health visible through Passport and Status.</p>
        <a href={privacy.href} data-urai-audit-action={privacy.action}>{privacy.detail}</a>
      </aside>
    </section>
  )
}
