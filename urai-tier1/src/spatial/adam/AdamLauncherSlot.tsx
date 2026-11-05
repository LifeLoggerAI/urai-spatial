'use client'

import { useEffect, useState } from 'react'

/** A portal target becomes available only after its own hydration completes. */
export default function AdamLauncherSlot({ name, as: SlotTag = 'span' }: { name: string; as?: 'span' | 'div' }) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return <SlotTag style={{ display: 'inline-flex', alignItems: 'center', minWidth: 64, minHeight: 48, maxWidth: '100%', flex: '0 1 auto' }} data-urai-adam-launcher-slot={name} data-urai-adam-launcher-ready={hydrated ? 'true' : 'false'} />
}
