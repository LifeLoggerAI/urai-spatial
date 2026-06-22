import "./home-spatial-world-final.css"
import HomeSpatialWorldFinal from "./HomeSpatialWorldFinal"
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
import './home-ground-production.css'
import './home-ground-shipping-world.css'
import './home-ground-final-object-visibility.css'
import './memory-surfaces-production-final.css'
import './home-scene-art-direction-final.css'
import HomeGroundWorldObjects from './HomeGroundWorldObjects'

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
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        data-urai-home-spatial-shell="true"
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        {children}
        <HomeSpatialWorldFinal />
        <HomeGroundWorldObjects />
      </body>
    </html>
  )
}
