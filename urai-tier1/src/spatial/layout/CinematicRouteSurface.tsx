import styles from './CinematicRouteSurface.module.css';

type LinkSpec = {
  label: string;
  href: string;
};

type SignalSpec = {
  label: string;
  value: string;
};

type PanelSpec = {
  title: string;
  body: string;
};

type Props = {
  tone: 'mirror' | 'passport' | 'status';
  eyebrow: string;
  title: string;
  lead: string;
  primary: LinkSpec;
  secondary?: LinkSpec;
  signals: SignalSpec[];
  panels: PanelSpec[];
  phrase?: string;
};

const railLinks: LinkSpec[] = [
  { label: 'Home', href: '/home' },
  { label: 'Life Map', href: '/life-map' },
  { label: 'Focus', href: '/focus?memoryId=quiet-reset' },
  { label: 'Replay', href: '/replay?manifestId=replay-recovery-thread' },
  { label: 'Passport', href: '/passport' },
  { label: 'Status', href: '/status' },
];

export function CinematicRouteSurface({
  tone,
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  signals,
  panels,
  phrase = 'Step inside yourself with ownership intact.',
}: Props) {
  return (
    <main className={`${styles.shell} ${styles[tone]}`}>
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.world} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className={styles.copy} aria-labelledby={`${tone}-title`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id={`${tone}-title`}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={primary.href}>{primary.label}</a>
          {secondary ? <a href={secondary.href}>{secondary.label}</a> : null}
        </div>
      </section>

      <aside className={styles.instrument} aria-label="URAI route state">
        <p>{phrase}</p>
        <div className={styles.signals}>
          {signals.map((signal) => (
            <span key={signal.label}>
              <small>{signal.label}</small>
              <strong>{signal.value}</strong>
            </span>
          ))}
        </div>
      </aside>

      <section className={styles.panels} aria-label="Route functions">
        {panels.map((panel) => (
          <article key={panel.title}>
            <h2>{panel.title}</h2>
            <p>{panel.body}</p>
          </article>
        ))}
      </section>

      <nav className={styles.rail} aria-label="URAI route rail">
        {railLinks.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </nav>
    </main>
  );
}
