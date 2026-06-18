import { NextResponse } from "next/server";
import { buildSpatialSystemContract } from "@/lib/spatial-system-contract";

export const dynamic = "force-static";
export const revalidate = false;

const contract = buildSpatialSystemContract();
const manifestPayload = {
  ok: true,
  service: contract.service,
  version: contract.version,
  domain: contract.domain,
  routes: contract.routes,
  api: contract.api,
  capabilities: contract.capabilities,
};

export async function GET() {
  return NextResponse.json(manifestPayload);
}
