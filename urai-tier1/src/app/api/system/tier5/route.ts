import { NextResponse } from "next/server";
import { getTier5SystemContract } from "@/lib/tier5-production-contract";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getTier5SystemContract());
}
