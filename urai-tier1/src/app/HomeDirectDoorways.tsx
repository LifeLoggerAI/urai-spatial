'use client'

import { useEffect, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

const HOME_ROUTES = new Set(['/', '/home'])

function navigateOnPointerDown(event: PointerEvent<HTMLAnchorElement>) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.stopPropagation()
  window.location.assign(event.currentTarget.href)
}

export default function HomeDirectDoorways() {
  const pathname = (usePathname() || '/').replace(/\/+$/, '') || '/'
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !HOME_ROUTES.has(pathname)) return null

  return createPortal(
    <>
      <style>{`
        .urai-home-direct-doorways {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          display: block !important;
          transform: none !important;
          pointer-events: none !important;
        }
        .urai-home-direct-doorways a {
          position: fixed !important;
          right: max(16px, env(safe-area-inset-right)) !important;
          left: auto !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
        }
        .urai-home-direct-doorways a:first-of-type {
          top: 38% !important;
          bottom: auto !important;
        }
        .urai-home-direct-doorways a:last-of-type {
          top: 48% !important;
          bottom: auto !important;
        }
      `}</style>
      <nav
        className="urai-home-direct-doorways"
        data-movement-ui="true"
        data-native-doorway-owner="document-body-portal"
        aria-label="Direct Home destinations"
      >
        <a
          aria-label="Open Ground directly"
          href="/ground/?entryPortal=home-direct&cameraCheckpoint=home-direct"
          onPointerDown={navigateOnPointerDown}
        >
          Ground
        </a>
        <a
          aria-label="Open Life Map directly"
          href="/life-map/?from=home-direct&entryPortal=home-direct&cameraCheckpoint=home-direct"
          onPointerDown={navigateOnPointerDown}
        >
          Life Map
        </a>
      </nav>
    </>,
    document.body,
  )
}
