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
import UraiAAAARoutePolish from './UraiAAAARoutePolish'
import './urai-aaaa-final-pass.css'
import './urai-proof-machine.css'
import UraiAutonomousV1Layer from './UraiAutonomousV1Layer'
import UraiV2OnboardingLayer from './UraiV2OnboardingLayer'
import UraiV2StateController from './UraiV2StateController'
import './aaa-graphics-rebuild-20260702.css'
import './mobile-viewport-final-fixes.css'
import './replay-mobile-control-clearance.css'
import './aaa-visual-authority-20260703.css'
import './lifemap-proof-crops.css'
import './urai-realm-accent-backgrounds.css'
import './spatial-first-root-launch.css'
import './urai-design-system.css'
import './route-layering-hotfix.css'
import './native-doorway-final-fix.css'
import './location-map-header-evidence-fix.css'
import './urai-production-system.css'
import WorldRuntimeBoundary from '@/spatial/world/WorldRuntimeBoundary'

const configuredBuildSha = process.env.NEXT_PUBLIC_URAI_BUILD_SHA ?? process.env.GITHUB_SHA ?? ''
const deployedSha = /^[0-9a-f]{40}$/.test(configuredBuildSha) ? configuredBuildSha : 'unverified'
const previewMode = process.env.NEXT_PUBLIC_URAI_PREVIEW_MODE === 'true'
const previewChannel = process.env.NEXT_PUBLIC_URAI_PREVIEW_CHANNEL?.trim() || 'isolated-preview'
const embeddedIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2307111c'/%3E%3Cpath d='M6 44c9-8 43-8 52 0v14H6z' fill='%23152f28'/%3E%3Ccircle cx='32' cy='27' r='14' fill='%238ce7ee'/%3E%3Ccircle cx='32' cy='27' r='19' fill='none' stroke='%238ce7ee' stroke-opacity='.22' stroke-width='2'/%3E%3C/svg%3E"

export const metadata: Metadata = {
  title: previewMode ? 'PREVIEW — URAI Spatial' : 'URAI Spatial',
  description: 'A private spatial world for memory, reflection, relationships, and personal intelligence.',
  icons: {
    icon: embeddedIcon,
  },
  other: {
    'urai-deployed-sha': deployedSha,
    'urai-preview-mode': previewMode ? 'true' : 'false',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#07101a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-urai-domain="app"
      data-urai-surface="spatial"
      data-urai-preview={previewMode ? 'true' : 'false'}
      data-urai-preview-channel={previewMode ? previewChannel : undefined}
    >
      <body
        data-urai-home-spatial-shell="true"
        data-urai-living-state-layer="v2"
        data-deployed-sha={deployedSha}
        data-deployment-evidence={deployedSha === 'unverified' ? 'missing' : 'embedded'}
        data-production-certification={previewMode ? 'not-certified-preview' : 'fingerprint-gated'}
        style={{ margin: 0, background: '#07101a', overflowX: 'hidden' }}
      >
        {previewMode ? (
          <div
            role="status"
            aria-label="Preview environment. Not production certified."
            data-testid="urai-global-preview-banner"
            style={{
              position: 'fixed',
              inset: '0 0 auto 0',
              zIndex: 2147483647,
              padding: '8px 12px',
              background: 'rgba(126, 34, 206, 0.96)',
              color: '#ffffff',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              lineHeight: 1.2,
              textAlign: 'center',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              boxShadow: '0 1px 18px rgba(0, 0, 0, 0.45)',
            }}
          >
            PREVIEW — NOT PRODUCTION CERTIFIED · {previewChannel} · {deployedSha.slice(0, 12)}
          </div>
        ) : null}
        <WorldRuntimeBoundary>
          <UraiAAAARoutePolish />
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
