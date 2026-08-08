export const tierOneRoutes = [
  { route: '/', file: 'src/app/page.tsx', kind: 'scene' },
  { route: '/home', file: 'src/app/home/page.tsx', kind: 'scene' },
  { route: '/ascent', file: 'src/app/ascent/page.tsx', kind: 'scene' },
  { route: '/life-map', file: 'src/app/life-map/page.tsx', kind: 'scene' },
  { route: '/demo', file: 'src/app/demo/page.tsx', kind: 'scene' },
  { route: '/demo/life-map', file: 'src/app/demo/life-map/page.tsx', kind: 'scene' },
  { route: '/replay', file: 'src/app/replay/page.tsx', kind: 'scene' },
  { route: '/mirror', file: 'src/app/mirror/page.tsx', kind: 'static' },
  { route: '/focus', file: 'src/app/focus/page.tsx', kind: 'scene' },
  { route: '/early-access', file: 'src/app/early-access/page.tsx', kind: 'access' },
  { route: '/invite/[code]', file: 'src/app/invite/[code]/page.tsx', kind: 'access' },
  { route: '/admin/invites', file: 'src/app/admin/invites/page.tsx', kind: 'admin' },
]

export const serverApiRoutes = [
  { route: '/api/entitlement', file: 'src/app/api/entitlement/route.ts', mustInclude: ['verifyIdToken', 'readEntitlement'] },
  { route: '/api/stripe/create-checkout-session', file: 'src/app/api/stripe/create-checkout-session/route.ts', mustInclude: ['checkout.sessions.create', 'verifyIdToken'] },
  { route: '/api/stripe/webhook', file: 'src/app/api/stripe/webhook/route.ts', mustInclude: ['constructEvent', 'upsertEntitlement'] },
  { route: '/api/stripe/webhook-v2', file: 'src/app/api/stripe/webhook-v2/route.ts', mustInclude: ['../webhook/route'] },
]

export const sceneRouteFiles = tierOneRoutes.filter((route) => route.kind === 'scene').map((route) => route.file)

export const legacySceneImports = [
  '@/spatial/client/SpatialSceneClient',
  '../../spatial/client/SpatialSceneClient',
  '@/spatial/scene/SpatialScene',
  '@/spatial/scene/FocusRouteStage',
  '@/spatial/layout/TierOneExperience',
  '@/components/urai/UraiV1Experience',
  '@/spatial/v1/UraiSpatialStage',
]

export const requiredTierOneFiles = [
  'src/scene/HomeScene.tsx',
  'src/scene/Orb.tsx',
  'src/scene/Sky.tsx',
  'src/scene/Ground.tsx',
  'src/scene/Atmosphere.tsx',
  'src/spatial/cinematic/CinematicCameraRig.tsx',
  'src/spatial/cinematic/CinematicParticles.tsx',
  'src/spatial/cinematic/CinematicPostProcessing.tsx',
  'src/spatial/cinematic/cameraPaths.ts',
  'src/spatial/constellation/ConstellationLayer.tsx',
  'src/spatial/layout/SpatialShell.tsx',
  'src/app/FinalHomeThreshold.tsx',
  'src/app/HomeSpatialRuntimeLayer.tsx',
  'src/spatial/lifemap/SpatialLifeMapCanonical.tsx',
  'src/spatial/layout/TierOneStaticShell.tsx',
  'src/spatial/narrator/NarratorVoice.tsx',
  'src/spatial/narrator/NarratorHud.tsx',
  'src/spatial/narrator/narratorStore.ts',
]

export const requiredServerFiles = [
  'src/lib/entitlementStore.ts',
  ...serverApiRoutes.map((route) => route.file),
]

export const requiredTierOneDependencies = [
  'firebase',
  'firebase-admin',
  'stripe',
]

export const requiredTierOneDevDependencies = [
  '@types/node',
]

export const envKeys = [
  { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', requiredFor: 'firebase' },
  { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', requiredFor: 'firebase' },
  { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', requiredFor: 'firebase' },
  { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', requiredFor: 'firebase' },
  { name: 'FIREBASE_SERVICE_ACCOUNT_JSON', requiredFor: 'server-entitlements' },
  { name: 'STRIPE_SECRET_KEY', requiredFor: 'stripe' },
  { name: 'STRIPE_WEBHOOK_SECRET', requiredFor: 'stripe' },
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_PRO', requiredFor: 'stripe' },
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST', requiredFor: 'stripe' },
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER', requiredFor: 'stripe' },
  { name: 'ELEVENLABS_API_KEY', requiredFor: 'elevenlabs', optional: true },
  { name: 'ELEVENLABS_VOICE_ID', requiredFor: 'elevenlabs', optional: true },
]
