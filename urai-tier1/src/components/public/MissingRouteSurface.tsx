import DocumentScrollArea from './DocumentScrollArea'
import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import styles from './MissingRouteSurface.module.css'

export default function MissingRouteSurface({ companion = true }: { companion?: boolean } = {}) {
  return (
    <DocumentScrollArea className={styles.shell} tabIndex={-1} aria-labelledby="page-unavailable-title">
      <div className={styles.content}>
        <div className={styles.orb} aria-hidden="true" />
        <p className={styles.eyebrow}>URAI</p>
        <h1 id="page-unavailable-title">This place isn’t part of your world</h1>
        <p className={styles.message}>The address may have changed, or this view may no longer be available.</p>
        <nav className={styles.actions} aria-label="Page actions">
          <a className={styles.action} href="/">Return home</a>
          {companion ? <AdamLauncherSlot name="missing-route-actions" /> : null}
        </nav>
      </div>
    </DocumentScrollArea>
  )
}
