import styles from './LaunchRoutePanel.module.css'

type LaunchRouteVariant = 'home' | 'life-map' | 'focus' | 'replay'

type LaunchRoute = {
  label: string
  href: string
  action: string
}

const routeLinks: LaunchRoute[] = [
  { label: 'Life Map', href: '/life-map', action: 'open-life-map' },
  { label: 'Focus', href: '/focus?memoryId=quiet-reset', action: 'open-focus' },
  { label: 'Replay', href: '/replay?manifestId=replay-recovery-thread', action: 'open-replay' },
  { label: 'Passport', href: '/passport', action: 'open-passport' },
  { label: 'Status', href: '/status', action: 'open-status' },
]

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  return (
    <section className={styles.shell} data-route-panel-variant={variant} aria-label="URAI Spatial home entry">
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.starfield} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>URAI Spatial</p>
        <h1>Own your life. Step inside yourself.</h1>
        <p className={styles.lead}>
          A private spatial world for memory, focus, replay, identity, and consent. Start in the Life Map, open one star, then keep the thread moving without leaving yourself behind.
        </p>
        <div className={styles.commandRow} aria-label="Primary launch actions">
          <a className={styles.primaryCta} href="/life-map" data-urai-audit-action="home-life-map">
            Enter Life Map
          </a>
          <a href="/focus?memoryId=quiet-reset" data-urai-audit-action="home-focus">
            Focus
          </a>
          <a href="/replay?manifestId=replay-recovery-thread" data-urai-audit-action="home-replay">
            Replay
          </a>
        </div>
      </div>

      <nav className={styles.routeDock} aria-label="URAI route shortcuts">
        {routeLinks.map((route) => (
          <a key={route.action} href={route.href} data-urai-audit-action={`${route.action}-dock`}>
            {route.label}
          </a>
        ))}
        <a href="/privacy-controls" data-urai-audit-action="open-privacy-controls-dock">
          Privacy
        </a>
      </nav>
    </section>
  )
}
