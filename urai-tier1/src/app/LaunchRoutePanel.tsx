import styles from './LaunchRoutePanel.module.css'

type LaunchRouteVariant = 'home' | 'life-map' | 'focus' | 'replay'

type LaunchRoute = {
  label: string
  href: string
  action: string
}

const launchMemoryId = 'quiet-reset'
const focusHref = `/focus?memoryId=${launchMemoryId}`
const replayHref = `/replay?memoryId=${launchMemoryId}&manifestId=replay-recovery-thread`

const routeLinks: LaunchRoute[] = [
  { label: 'Life Map', href: '/life-map', action: 'open-life-map' },
  { label: 'Focus', href: focusHref, action: 'open-focus' },
  { label: 'Replay', href: replayHref, action: 'open-replay' },
  { label: 'Mirror', href: '/mirror', action: 'open-mirror' },
  { label: 'Passport', href: '/passport', action: 'open-passport' },
  { label: 'Status', href: '/status', action: 'open-status' },
  { label: 'Unwind', href: '/unwind', action: 'open-unwind' },
  { label: 'Ascent', href: '/ascent', action: 'open-ascent' },
  { label: 'Privacy', href: '/privacy-controls', action: 'open-privacy-controls' },
]

const pathSteps = [
  ['01', 'Life Map', 'open the constellation', '/life-map'],
  ['02', 'Focus', 'hold one selected star', focusHref],
  ['03', 'Replay', 'move the thread', replayHref],
]

export function LaunchRoutePanel({ variant }: { variant: LaunchRouteVariant }) {
  return (
    <section className={styles.shell} data-route-panel-variant={variant} aria-label="URAI Spatial home entry">
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.starfield} aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>

      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>URAI Spatial · Home World</p>
        <h1>Own your life. Step inside yourself.</h1>
        <p className={styles.lead}>
          A private spatial world for memory, focus, replay, identity, and consent. Enter the Life Map, choose one star, then carry that same thread through Focus, Replay, Passport, and Status.
        </p>
        <div className={styles.commandRow} aria-label="Primary launch actions">
          <a className={styles.primaryCta} href="/life-map" data-urai-audit-action="home-life-map">Enter Life Map</a>
          <a href={focusHref} data-urai-audit-action="home-focus">Open Focus</a>
          <a href={replayHref} data-urai-audit-action="home-replay">Start Replay</a>
          <a href="/life-map?orb=open" data-urai-audit-action="home-orb-companion">Open URAI orb companion</a>
        </div>
      </div>

      <a className={styles.worldPortal} href="/life-map" data-urai-audit-action="home-world-portal" aria-label="Enter the URAI Life Map">
        <span className={styles.portalCore} aria-hidden="true" />
        <strong>34 stars awake</strong>
        <small>Life Map online</small>
      </a>

      <div className={styles.pathThread} aria-label="Canonical URAI route path">
        {pathSteps.map(([index, label, detail, href]) => (
          <a key={label} href={href}>
            <span>{index}</span>
            <strong>{label}</strong>
            <small>{detail}</small>
          </a>
        ))}
      </div>

      <nav className={styles.routeDock} aria-label="URAI route shortcuts">
        {routeLinks.map((route) => (
          <a key={route.action} href={route.href} data-urai-audit-action={`${route.action}-dock`}>
            {route.label}
          </a>
        ))}
      </nav>
    </section>
  )
}
