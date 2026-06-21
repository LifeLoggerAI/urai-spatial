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
    lead: 'URAI opens like a private world, not a feed. Memories become stars, Focus steadies one signal, Replay turns a thread cinematic, and Passport keeps identity, consent, and provenance visible.',
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

const proofSignals = ['Private by default', 'No dead routes', 'Static-export safe']

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  const copy = copyByVariant[variant]
  const primaryRoutes = launchRoutes.slice(0, 6)
  const privacy = launchRoutes[6]

  return (
    <section className={styles.shell} data-route-panel-variant={variant} aria-label="URAI Spatial home world launch controls">
      <div className={styles.depthField} aria-hidden="true" />
      <div className={styles.starfield} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.horizon} aria-hidden="true" />

      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.lead}>{copy.lead}</p>
        <p className={styles.signature}>{copy.signature}</p>
        <div className={styles.proofStrip} role="list" aria-label="Launch guarantees">
          {proofSignals.map((signal) => (
            <span key={signal} role="listitem">{signal}</span>
          ))}
        </div>
      </div>

      <a className={styles.worldPortal} href={copy.primaryHref} data-urai-audit-action={copy.primaryAction} aria-label={`${copy.primaryLabel}: open URAI's living memory constellation`}>
        <span className={styles.portalRings} aria-hidden="true" />
        <span className={styles.portalCore} aria-hidden="true" />
        <span className={styles.portalLabel}>
          <strong>{copy.primaryLabel}</strong>
          <span>Open the living constellation</span>
        </span>
      </a>

      <nav className={styles.orbitNav} aria-label="Primary URAI routes">
        {primaryRoutes.map((route, index) => (
          <a key={route.action} href={route.href} data-urai-audit-action={route.action}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{route.label}</strong>
            <em>{route.kicker}</em>
          </a>
        ))}
      </nav>

      <div className={styles.companionLine} aria-label="URAI companion state">
        <span>URAI Orb Companion</span>
        <strong>present, quiet, public-safe</strong>
      </div>

      <nav className={styles.routeRail} aria-label="Launch route rail">
        {primaryRoutes.map((route) => (
          <a key={route.action} href={route.href} data-urai-audit-action={`${route.action}-rail`}>
            {route.label}
          </a>
        ))}
        <a href={privacy.href} data-urai-audit-action={privacy.action}>{privacy.label}</a>
      </nav>
    </section>
  )
}
