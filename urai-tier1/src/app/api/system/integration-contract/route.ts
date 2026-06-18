import { NextResponse } from "next/server";
import { buildSpatialSystemContract } from "@/lib/spatial-system-contract";
import {
  spatialLaunchBoundary,
} from "@/lib/spatial-launch-boundaries";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    ...buildSpatialSystemContract(),
    launchBoundary: spatialLaunchBoundary,
  });
}
