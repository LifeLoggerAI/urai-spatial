import { NextResponse } from 'next/server'
import { requireFirebaseUser } from '@/lib/google-workspace/firebase-user'
import { buildGoogleAuthorizationUrl, createOAuthState, createPkcePair } from '@/lib/google-workspace/oauth'
import { GOOGLE_OAUTH_COOKIE, sealOAuthState } from '@/lib/google-workspace/oauth-state'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request)
    const state = createOAuthState()
    const { verifier, challenge } = createPkcePair()
    const authorizationUrl = buildGoogleAuthorizationUrl({ state, codeChallenge: challenge })

    const response = NextResponse.json({ authorizationUrl })
    response.cookies.set(GOOGLE_OAUTH_COOKIE, sealOAuthState({ uid: user.uid, state, verifier }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/google/oauth/callback',
      maxAge: 10 * 60,
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google OAuth could not start'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
