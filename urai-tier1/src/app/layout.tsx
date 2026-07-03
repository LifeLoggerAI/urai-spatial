import UraiFinalAssetSpineSceneLayer from './UraiFinalAssetSpineSceneLayer'
import UraiFinalAssetSpineBridge from './UraiFinalAssetSpineBridge'
import './home-spatial-world-final.css'
import './home-one-world-owner.css'
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
import './home-world-aaa-final.css'
import './home-orb-final-positioning.css'
import './home-orb-final-motion-fix.css'
import './home-world-screenshot-hotfix.css'
import './launch-candidate-final-pass.css'
import './urai-cinematic-backdrop.css'
import './aaa-launch-polish-final.css'
import './aaa-final-finishing-wall.css'
import './aaa-launch-proof-layer.css'
import './screenshot-audit-fixes.css'
import './aaa-real-world-final-pass.css'
import './urai-canon-camera-transitions.css'
import './aaa-interaction-final-hotfix.css'
import './aaa-live-visual-proof-polish.css'
import UraiCinematicBackdrop from './UraiCinematicBackdrop'
import UraiAAAARoutePolish from './UraiAAAARoutePolish'
import './urai-aaaa-final-pass.css'
import './urai-proof-machine.css'
import UraiAutonomousV1Layer from './UraiAutonomousV1Layer'
import './aaa-graphics-rebuild-20260702.css'
import './mobile-viewport-final-fixes.css'
import './aaa-visual-authority-20260703.css'
import './lifemap-proof-crops.css'

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
        <UraiAAAARoutePolish />
        <UraiCinematicBackdrop />
        <UraiFinalAssetSpineSceneLayer />
        <UraiFinalAssetSpineBridge />
        {children}
        <UraiAutonomousV1Layer />
      </body>
    </html>
  )
}
