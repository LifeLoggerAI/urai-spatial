import { NextResponse } from "next/server";
import { URAI_SPATIAL_SERVICE, URAI_SPATIAL_VERSION } from "@/lib/spatial-system-contract";
import {
  assertSpatialFallbackMode,
  spatialDeferredCapabilities,
  spatialLaunchBoundary,
  spatialLiveProviderRequirements,
} from "@/lib/spatial-launch-boundaries";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    version: URAI_SPATIAL_VERSION,
    launchBoundary: spatialLaunchBoundary,
    fallbackMode: assertSpatialFallbackMode(),
    deferredCapabilities: spatialDeferredCapabilities,
    requirementsBeforeLiveProviders: spatialLiveProviderRequirements,
  });
}
