import { NextResponse } from "next/server";
import { URAI_SPATIAL_SERVICE, spatialCapabilities, spatialTargets } from "@/lib/spatial-system-contract";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    capabilities: spatialCapabilities,
    targets: spatialTargets,
    fallbackMode: true,
  });
}
