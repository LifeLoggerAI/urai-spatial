import { NextResponse } from 'next/server';
import { buildUraiSpatialTierLockContract } from '@/components/lifemap/uraiSpatialTierLockContract';

export async function GET() {
  return NextResponse.json(buildUraiSpatialTierLockContract());
}
