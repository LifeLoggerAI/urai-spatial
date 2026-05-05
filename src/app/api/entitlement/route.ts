import { NextResponse } from 'next/server';
import { readEntitlement } from '@/lib/entitlementStore';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'local';

  const entitlement = await readEntitlement(userId);

  return NextResponse.json({ entitlement });
}
