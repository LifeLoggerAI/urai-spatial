import type { Metadata, Viewport } from 'next'
import '../src/app/globals.css'
import '../src/app/accessibility.css'
import '../src/app/boundary.css'
import '../src/scene/spatialVisualOverlay.css'
import '../src/scene/moonlitSpatialContinuity.css'
import '../src/spatial/home/visual/HomeScene.css'
import '../src/spatial/home/visual/HomeSceneFinalPass.css'
import '../src/spatial/companion/companionPolish.css'
import '../src/scene/cinematicFocusTier5.css'
import '../src/spatial/memory/memoryStarArtifact.css'
import '../src/app/spatial-polish.css'
import '../src/app/spatial-audit-hardening.css'

export const metadata: Metadata = {
  title: 'URAI Spatial',
  description: 'Cinematic, spatial, interactive URAI runtime',
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        data-debug-spatial={process.env.NEXT_PUBLIC_URAI_DEBUG_SPATIAL === 'true' ? 'true' : 'false'}
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        {children}
      </body>
    </html>
  )
}
