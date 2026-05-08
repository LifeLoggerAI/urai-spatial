import { NextResponse } from "next/server";
import { buildBodyBiometricResponse } from "@/lib/body-biometric-contract";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(buildBodyBiometricResponse(body));
  } catch {
    return NextResponse.json({ ok: false, service: "urai-spatial", error: "Unable to read body biometric request." }, { status: 400 });
  }
}
