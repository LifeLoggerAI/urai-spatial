import type { Metadata, Viewport } from 'next'
import './globals.css'
import './launch-home-polish.css'
import './life-map-production-3d.css'
import './accessibility.css'
import './boundary.css'
import '@/scene/spatialVisualOverlay.css'
import '@/scene/moonlitSpatialContinuity.css'
import '@/spatial/home/visual/HomeScene.css'
import '@/spatial/home/visual/HomeSceneFinalPass.css'
import '@/spatial/companion/companionPolish.css'
import '@/scene/cinematicFocusTier5.css'
import '@/spatial/memory/memoryStarArtifact.css'
import './spatial-polish.css'
import './spatial-audit-hardening.css'
import './urai-v1.css'
import './ship-ready-visual-pass.css'

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
        data-urai-home-spatial-shell="true"
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        {children}
      </body>
    </html>
  )
}
