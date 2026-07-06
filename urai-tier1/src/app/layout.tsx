import UraiFinalAssetSpineSceneLayer from './UraiFinalAssetSpineSceneLayer'
import UraiFinalAssetSpineBridge from './UraiFinalAssetSpineBridge'
import './home-spatial-world-final.css'
import './home-one-world-owner.css'
import type { Metadata, Viewport } from 'next'
import {
  URAI_BRAND_NAME,
  URAI_CANONICAL_URL,
  URAI_CREATOR_NAME,
  URAI_PRODUCT_NAME,
  URAI_PUBLIC_DESCRIPTION,
  uraiOrganizationSchema,
  uraiWebsiteSchema,
} from '@/lib/brand-authority'
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

export const metadata: Metadata = {
  metadataBase: new URL(URAI_CANONICAL_URL),
  title: {
    default: `${URAI_BRAND_NAME} — ${URAI_PRODUCT_NAME}`,
    template: `%s | ${URAI_BRAND_NAME}`,
  },
  description: URAI_PUBLIC_DESCRIPTION,
  applicationName: URAI_PRODUCT_NAME,
  authors: [{ name: URAI_CREATOR_NAME, url: '/about' }],
  creator: URAI_CREATOR_NAME,
  publisher: URAI_BRAND_NAME,
  category: 'technology',
  keywords: [
    'URAI Labs',
    'URAI',
    'Adam Clamp',
    'spatial computing',
    'memory',
    'reflection',
    'personal data ownership',
    'privacy-first AI',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: URAI_CANONICAL_URL,
    siteName: URAI_BRAND_NAME,
    title: `${URAI_BRAND_NAME} — ${URAI_PRODUCT_NAME}`,
    description: URAI_PUBLIC_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'URAI Labs — Own your life. Step inside yourself.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${URAI_BRAND_NAME} — ${URAI_PRODUCT_NAME}`,
    description: URAI_PUBLIC_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
        data-urai-living-state-layer="v2"
        style={{ margin: 0, background: '#08030f', overflowX: 'hidden' }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(uraiOrganizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(uraiWebsiteSchema) }}
        />
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
