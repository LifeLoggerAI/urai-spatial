'use client'

import { requestAdamOpen } from './adamPresenceEvents'
import styles from './AdamPresenceRuntime.module.css'

export default function AdamLauncherSlot({ slot }: { slot: string }) {
  return (
    <span data-urai-adam-launcher-slot={slot}>
      <button
        type="button"
        className={`${styles.launcher} ${styles.inlineLauncher}`}
        data-urai-adam-launcher="true"
        data-adam-launcher-placement="inline-slot"
        aria-label="Talk with Adam"
        onClick={requestAdamOpen}
      >Adam</button>
    </span>
  )
}
