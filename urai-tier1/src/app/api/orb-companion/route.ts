import { NextResponse } from "next/server";
import { buildOrbCompanionResponse } from "@/lib/orb-companion-contract";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(buildOrbCompanionResponse(body));
  } catch {
    return NextResponse.json({ ok: false, service: "urai-spatial", error: "Unable to read orb companion request." }, { status: 400 });
  }
}
