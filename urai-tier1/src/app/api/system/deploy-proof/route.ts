import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

const releaseMarker = 'urai-spatial-public-surface-2026-06-29-homeworldproduction';
const sourceSurface = 'TierOneExperience:HomeWorldProduction';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'urai-spatial-deploy-proof',
    repository: 'LifeLoggerAI/urai-spatial',
    runtimeRoot: 'urai-tier1',
    releaseMarker,
    sourceSurface,
    publicRoutes: ['/', '/home', '/spatial', '/spatial/ar-vr', '/life-map'],
    forbiddenLiveCopy: [
      'Launch build is compiling successfully',
      'Full app deployment is being finalized',
      'Opening your spatial field',
      'Preparing the scene',
      'prototype',
      'placeholder',
    ],
    environment: {
      commitSha:
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        process.env.NEXT_PUBLIC_GIT_SHA ||
        process.env.SOURCE_VERSION ||
        'unknown',
      firebaseProject:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        'unknown',
    },
  });
}
