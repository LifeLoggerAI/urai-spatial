import { NextResponse } from 'next/server';
import { buildUraiSpatialTierLockContract } from '@/components/lifemap/uraiSpatialTierLockContract';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json(buildUraiSpatialTierLockContract());
}
