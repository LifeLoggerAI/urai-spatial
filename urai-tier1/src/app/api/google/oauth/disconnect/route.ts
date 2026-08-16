import { NextResponse } from 'next/server'
import { requireFirebaseUser } from '@/lib/google-workspace/firebase-user'
import { disconnectGoogle } from '@/lib/google-workspace/token-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request)
    await disconnectGoogle(user.uid)
    return NextResponse.json({ disconnected: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
