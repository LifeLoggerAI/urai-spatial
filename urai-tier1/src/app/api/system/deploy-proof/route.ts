import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

const releaseMarker = 'urai-spatial-public-surface-2026-06-29-homeworldproduction';
const proofSchemaVersion = 'urai-spatial-deploy-proof-v2-2026-06-30';
const sourceSurface = 'HomeSpatialRuntimeLayer:AssetDrivenHomeWorld';

const publicRoutes = [
  '/',
  '/home',
  '/ground',
  '/life-map',
  '/focus?memoryId=quiet-reset',
  '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
  '/life-movie',
  '/council',
  '/xr',
  '/mirror',
  '/passport',
  '/privacy',
  '/privacy-policy',
  '/account-deletion',
  '/privacy-controls',
  '/settings/privacy',
  '/support',
  '/onboarding',
  '/signup',
  '/login',
  '/location-map',
  '/waitlist',
  '/system',
  '/status',
  '/spatial/ar-vr',
] as const;

const forbiddenLiveCopy = [
  'Launch build is compiling successfully',
  'Full app deployment is being finalized',
  'Opening your spatial field',
  'Preparing the scene',
  'prototype',
  'placeholder',
] as const;

function resolveCommitSha(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.NEXT_PUBLIC_GIT_SHA ||
    process.env.SOURCE_VERSION ||
    'unknown'
  );
}

export async function GET() {
  const commitSha = resolveCommitSha();

  return NextResponse.json({
    ok: true,
    service: 'urai-spatial-deploy-proof',
    repository: 'LifeLoggerAI/urai-spatial',
    runtimeRoot: 'urai-tier1',
    proofSchemaVersion,
    releaseMarker,
    sourceSurface,
    publicRoutes,
    requiredSmokeRoutes: publicRoutes,
    forbiddenLiveCopy,
    claimBoundaries: {
      spatialWebPreview: 'live-preview',
      webxr: 'progressive-enhancement',
      questBrowser: 'unverified-until-device-proof',
      lifeMapData: 'authenticated-private-firestore-or-explicit-demo-only',
      lifeMovieData: 'authenticated-owner-memories',
      councilProvider: 'authenticated-consented-openai-with-disclosed-local-fallback',
      capturedReality: 'private-owner-consent-and-release-gated',
    },
    deploymentFreshness: {
      commitSha,
      commitShaKnown: commitSha !== 'unknown',
      requiredForReady: true,
    },
    environment: {
      commitSha,
      firebaseProject:
        process.env.URAI_SPATIAL_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        'unknown',
    },
  });
}
