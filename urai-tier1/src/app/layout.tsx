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
import UraiV2OnboardingLayer from './UraiV2OnboardingLayer'
import UraiV2StateController from './UraiV2StateController'
import './aaa-graphics-rebuild-20260702.css'
import './mobile-viewport-final-fixes.css'
import './aaa-visual-authority-20260703.css'
import './lifemap-proof-crops.css'
import './urai-realm-accent-backgrounds.css'
import './spatial-first-root-launch.css'
import './urai-design-system.css'
import './route-layering-hotfix.css'
import WorldRuntimeBoundary from '@/spatial/world/WorldRuntimeBoundary'

const configuredBuildSha = process.env.NEXT_PUBLIC_URAI_BUILD_SHA ?? process.env.GITHUB_SHA ?? ''
const deployedSha = /^[0-9a-f]{40}$/.test(configuredBuildSha) ? configuredBuildSha : 'unverified'
const embeddedIcon = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22g%22%20cx%3D%2250%25%22%20cy%3D%2240%25%22%20r%3D%2262%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23bfe7ff%22%2F%3E%3Cstop%20offset%3D%2255%25%22%20stop-color%3D%22%234ba6ff%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23071427%22%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%23030712%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2220%22%20fill%3D%22url%28%23g%29%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%229%22%20fill%3D%22%23dff4ff%22%20fill-opacity%3D%220.85%22%2F%3E%3C%2Fsvg%3E'

export const metadata: Metadata = {
  title: 'URAI Spatial',
  description: 'Cinematic, spatial, interactive URAI runtime',
  icons: {
    icon: embeddedIcon,
  },
  other: {
    'urai-deployed-sha': deployedSha,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-urai-domain="app" data-urai-surface="spatial">
      <body
        data-urai-home-spatial-shell="true"
        data-urai-living-state-layer="v2"
        data-deployed-sha={deployedSha}
        data-deployment-evidence={deployedSha === 'unverified' ? 'missing' : 'embedded'}
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        <WorldRuntimeBoundary>
          <UraiAAAARoutePolish />
          <UraiCinematicBackdrop />
          <UraiFinalAssetSpineSceneLayer />
          <UraiFinalAssetSpineBridge />
          {children}
          <UraiAutonomousV1Layer />
          <UraiV2StateController />
          <UraiV2OnboardingLayer />
        </WorldRuntimeBoundary>
      </body>
    </html>
  )
}
