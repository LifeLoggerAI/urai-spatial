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
import { publicIdentity, publicIdentityJsonLd } from '@/data/publicIdentity'

const configuredBuildSha = process.env.NEXT_PUBLIC_URAI_BUILD_SHA ?? process.env.GITHUB_SHA ?? ''
const deployedSha = /^[0-9a-f]{40}$/.test(configuredBuildSha) ? configuredBuildSha : 'unverified'
const structuredIdentity = JSON.stringify(publicIdentityJsonLd).replace(/</g, '\\u003c')

export const metadata: Metadata = {
  metadataBase: new URL(publicIdentity.canonicalUrl),
  applicationName: publicIdentity.runtimeName,
  title: {
    default: publicIdentity.runtimeName,
    template: `%s · ${publicIdentity.productName}`,
  },
  description: publicIdentity.description,
  authors: [
    {
      name: publicIdentity.creator.name,
      url: publicIdentity.creator.profilePath,
    },
  ],
  creator: publicIdentity.creator.name,
  publisher: publicIdentity.productName,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: publicIdentity.runtimeName,
    title: publicIdentity.runtimeName,
    description: publicIdentity.description,
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: publicIdentity.runtimeName,
    description: publicIdentity.description,
  },
  icons: {
    icon: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  other: {
    'urai-deployed-sha': deployedSha,
    'urai-canonical-repository': publicIdentity.repositoryUrl,
    'urai-production-authority': 'LifeLoggerAI/urai-spatial/urai-tier1/main',
    'urai-claims-boundary': publicIdentity.publicBoundary,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#08030f',
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredIdentity }} />
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
