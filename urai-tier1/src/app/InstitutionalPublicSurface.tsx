import type { ReactNode } from 'react'
import styles from './InstitutionalPublicSurface.module.css'

type PublicSurfaceLink = {
  href: string
  label: string
  primary?: boolean
}

type InstitutionalPublicSurfaceProps = {
  eyebrow: string
  title: string
  lede: string
  note?: string
  links: PublicSurfaceLink[]
  children?: ReactNode
}

export default function InstitutionalPublicSurface({
  eyebrow,
  title,
  lede,
  note,
  links,
  children,
}: InstitutionalPublicSurfaceProps) {
  return (
    <main className={styles.shell}>
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.card}>
        <a className={styles.brand} href="/" aria-label="Return to URAI Home">URAI</a>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.lede}>{lede}</p>
        {children ? <div className={styles.content}>{children}</div> : null}
        {note ? <p className={styles.note}>{note}</p> : null}
        <nav className={styles.actions} aria-label="Page actions">
          {links.map((link) => (
            <a
              key={link.href + link.label}
              className={link.primary ? styles.primary : styles.secondary}
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </section>
      <footer className={styles.footer}>
        <a href="/privacy-controls">Privacy & consent</a>
        <a href="/support">Support</a>
        <a href="/status">Status</a>
      </footer>
    </main>
  )
}
