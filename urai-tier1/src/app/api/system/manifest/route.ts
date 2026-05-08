import { NextResponse } from "next/server";
import { buildSpatialSystemContract } from "@/lib/spatial-system-contract";

export async function GET() {
  const contract = buildSpatialSystemContract();
  return NextResponse.json({
    ok: true,
    service: contract.service,
    version: contract.version,
    domain: contract.domain,
    routes: contract.routes,
    api: contract.api,
    capabilities: contract.capabilities,
  });
}
