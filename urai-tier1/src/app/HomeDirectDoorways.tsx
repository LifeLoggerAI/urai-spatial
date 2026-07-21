'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

const HOME_ROUTES = new Set(['/', '/home'])

export default function HomeDirectDoorways() {
  const pathname = (usePathname() || '/').replace(/\/+$/, '') || '/'
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !HOME_ROUTES.has(pathname)) return null

  return createPortal(
    <nav
      className="urai-home-direct-doorways"
      data-movement-ui="true"
      data-native-doorway-owner="document-body-portal"
      aria-label="Direct Home destinations"
    >
      <a
        aria-label="Open Ground directly"
        href="/ground/?entryPortal=home-direct&cameraCheckpoint=home-direct"
      >
        Ground
      </a>
      <a
        aria-label="Open Life Map directly"
        href="/life-map/?from=home-direct&entryPortal=home-direct&cameraCheckpoint=home-direct"
      >
        Life Map
      </a>
    </nav>,
    document.body,
  )
}
