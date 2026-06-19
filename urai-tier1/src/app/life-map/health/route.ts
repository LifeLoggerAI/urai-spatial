import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;


export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "urai-spatial",
    route: "/life-map/health",
    surface: "life-map",
    status: "fallback-demo-ready",
    liveData: false,
    timestamp: new Date().toISOString(),
  });
}
