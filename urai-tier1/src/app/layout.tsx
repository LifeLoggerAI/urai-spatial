import type { Metadata, Viewport } from 'next'
import './globals.css'
import './accessibility.css'
import './spatial-world.css'
import './spatial-immersive.css'
import './cinematic-continuity.css'
import './life-map-living.css'
import './aaa-final-launch.css'
import './aaa-world-final.css'
import './aaa-world-final-v2.css'
import './world-rebuild-20260701.css'
import './aaa-graphics-rebuild-20260702.css'
import './mobile-viewport-final-fixes.css'
import './aaa-visual-authority-20260703.css'
import './lifemap-proof-crops.css'
import './urai-realm-accent-backgrounds.css'
import UraiAAAARoutePolish from './UraiAAAARoutePolish'
import UraiCinematicBackdrop from './UraiCinematicBackdrop'
import UraiFinalAssetSpineSceneLayer from './UraiFinalAssetSpineSceneLayer'
import UraiFinalAssetSpineBridge from './UraiFinalAssetSpineBridge'
import UraiAutonomousV1Layer from './UraiAutonomousV1Layer'
import UraiV2OnboardingLayer from './UraiV2OnboardingLayer'
import UraiV2StateController from './UraiV2StateController'

const configuredBuildSha = process.env.NEXT_PUBLIC_URAI_BUILD_SHA ?? process.env.GITHUB_SHA ?? ''
const deployedSha = /^[0-9a-f]{40}$/.test(configuredBuildSha) ? configuredBuildSha : 'unverified'

export const metadata: Metadata = {
  title: 'URAI Spatial',
  description: 'Cinematic, spatial, interactive URAI runtime',
  icons: {
    icon: '/icon.svg',
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
    <html lang="en">
      <body
        data-urai-home-spatial-shell="true"
        data-urai-living-state-layer="v2"
        data-deployed-sha={deployedSha}
        data-deployment-evidence={deployedSha === 'unverified' ? 'missing' : 'embedded'}
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        <UraiAAAARoutePolish />
        <UraiCinematicBackdrop />
        <UraiFinalAssetSpineSceneLayer />
        <UraiFinalAssetSpineBridge />
        {children}
        <UraiAutonomousV1Layer />
        <UraiV2StateController />
        <UraiV2OnboardingLayer />
      </body>
    </html>
  )
}
