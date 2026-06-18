import { NextResponse } from 'next/server';
import { buildTier2SystemRegistry } from '@/lib/tier2-system-registry';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json(buildTier2SystemRegistry());
}
