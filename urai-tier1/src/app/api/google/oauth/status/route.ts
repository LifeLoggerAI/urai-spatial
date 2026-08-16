import { NextResponse } from 'next/server'
import { requireFirebaseUser } from '@/lib/google-workspace/firebase-user'
import { googleConnectionStatus } from '@/lib/google-workspace/token-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request)
    return NextResponse.json(await googleConnectionStatus(user.uid))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
