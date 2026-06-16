import { NextResponse } from "next/server";
import { getTier4SystemContract } from "@/lib/tier4-production-contract";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getTier4SystemContract());
}
