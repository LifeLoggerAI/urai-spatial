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

type LaunchRoute = {
  label: string
  href: string
  action: string
  detail: string
}

const copyByVariant: Record<LaunchRouteVariant, RoutePanelCopy> = {
  home: {
    eyebrow: 'Home World · launch surface live',
    title: 'Own your life. Step inside yourself.',
    lead: 'URAI turns memory, mood, place, replay, and reflection into one private spatial world you can enter. Start in the Life Map, focus a star, replay the thread, then keep ownership through Passport and Status.',
    primaryHref: '/life-map',
    primaryLabel: 'Open Life Map',
    primaryAction: 'home-life-map',
  },
  'life-map': {
    eyebrow: 'Life Map · constellation live',
    title: 'Stars are doors into your world.',
    lead: 'Explore the memory constellation, open a selected star in Focus, and continue into Replay without losing the thread or landing on a dead route.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Open selected memory',
    primaryAction: 'life-map-focus',
  },
  focus: {
    eyebrow: 'Focus · selected memory live',
    title: 'Stay with one signal.',
    lead: 'Focus keeps one memory stable, readable, and ready to replay while privacy, exit paths, and route controls stay visible.',
    primaryHref: '/replay?manifestId=replay-recovery-thread',
    primaryLabel: 'Continue into Replay',
    primaryAction: 'focus-replay',
  },
  replay: {
    eyebrow: 'Replay · cinematic thread live',
    title: 'Replay turns memory into motion.',
    lead: 'Move through a guided replay path, then return to Focus, Life Map, Passport, or Home without breaking the spatial thread.',
    primaryHref: '/focus?memoryId=quiet-reset',
    primaryLabel: 'Back to Focus',
    primaryAction: 'replay-focus',
  },
}

const launchRoutes: LaunchRoute[] = [
  { label: 'Life Map', href: '/life-map', action: 'open-life-map', detail: 'Explore the living memory constellation.' },
  { label: 'Focus', href: '/focus?memoryId=quiet-reset', action: 'open-focus', detail: 'Open one stable memory chamber.' },
  { label: 'Replay', href: '/replay?manifestId=replay-recovery-thread', action: 'open-replay', detail: 'Enter the cinematic memory thread.' },
  { label: 'Mirror', href: '/mirror', action: 'open-mirror', detail: 'Reflect without leaving the world.' },
  { label: 'Passport', href: '/passport', action: 'open-passport', detail: 'Review identity, consent, and provenance.' },
  { label: 'Status', href: '/status', action: 'open-status', detail: 'See launch readiness and route health.' },
  { label: 'Privacy', href: '/privacy-controls', action: 'open-privacy-controls', detail: 'Control what is private before anything expands.' },
]

const proofPills = ['Private by default', 'Every route exits', 'Static-export safe']

const worldSignals = [
  { label: 'Life Map', copy: 'Stars open into Focus, Replay, and place-based meaning layers.' },
  { label: 'Focus', copy: 'One selected memory remains stable across the route chain.' },
  { label: 'Passport', copy: 'Identity, provenance, and consent stay visible at the surface.' },
]

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  const copy = copyByVariant[variant]

  return (
    <section className={styles.panel} data-route-panel-variant={variant} aria-label="URAI Spatial launch route controls">
      <article className={styles.hero}>
        <div className={styles.copyColumn}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>

          <div className={styles.proofStrip} role="list" aria-label="Launch guarantees">
            {proofPills.map((pill) => (
              <span key={pill} role="listitem">{pill}</span>
            ))}
          </div>

          <nav className={styles.actions} aria-label="Primary URAI routes">
            <a className={styles.primaryAction} data-urai-audit-action={copy.primaryAction} href={copy.primaryHref}>
              {copy.primaryLabel}
            </a>
            {launchRoutes.map((route) => (
              <a key={route.action} data-urai-audit-action={route.action} href={route.href}>
                {route.label}
              </a>
            ))}
          </nav>
        </div>

        <aside className={styles.worldColumn} aria-label="URAI world readiness">
          <div className={styles.orbCard}>
            <span className={styles.orb} aria-hidden="true" />
            <div>
              <strong>URAI Orb Companion</strong>
              <p>Present, quiet, and routed into the world without taking ownership of the user&apos;s story.</p>
            </div>
          </div>

          <div className={styles.signalGrid}>
            {worldSignals.map((signal) => (
              <div key={signal.label} className={styles.signalCard}>
                <strong>{signal.label}</strong>
                <p>{signal.copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </article>

      <aside className={styles.rail} aria-label="Route readiness notes">
        {launchRoutes.slice(0, 6).map((route) => (
          <a key={route.action} href={route.href} data-urai-audit-action={`${route.action}-rail`}>
            <strong>{route.label}</strong>
            <span>{route.detail}</span>
          </a>
        ))}
      </aside>
    </section>
  )
}
