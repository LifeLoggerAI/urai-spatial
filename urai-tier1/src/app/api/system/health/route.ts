import { NextResponse } from "next/server";
import { URAI_SPATIAL_SERVICE, URAI_SPATIAL_VERSION } from "@/lib/spatial-system-contract";

export const dynamic = "force-static";
export const revalidate = false;

const staticHealthGeneratedAt = new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    version: URAI_SPATIAL_VERSION,
    status: "ready",
    mode: "local-fallback-capable",
    timestamp: staticHealthGeneratedAt,
  });
}
