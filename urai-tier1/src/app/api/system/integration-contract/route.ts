import { NextResponse } from "next/server";
import { buildSpatialSystemContract } from "@/lib/spatial-system-contract";

export async function GET() {
  return NextResponse.json(buildSpatialSystemContract());
}
