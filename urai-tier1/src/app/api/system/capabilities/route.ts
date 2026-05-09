import { NextResponse } from "next/server";
import {
  URAI_SPATIAL_SERVICE,
  spatialCapabilities,
  spatialTargets,
} from "@/lib/spatial-system-contract";
import {
  spatialDeferredCapabilities,
  spatialLaunchBoundary,
  spatialLiveProviderRequirements,
} from "@/lib/spatial-launch-boundaries";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    capabilities: spatialCapabilities,
    targets: spatialTargets,
    fallbackMode: true,
    launchBoundary: spatialLaunchBoundary,
    deferredCapabilities: spatialDeferredCapabilities,
    requirementsBeforeLiveProviders: spatialLiveProviderRequirements,
  });
}
