import { NextRequest, NextResponse } from 'next/server'
import { exchangeGoogleAuthorizationCode } from '@/lib/google-workspace/oauth'
import { GOOGLE_OAUTH_COOKIE, openOAuthState } from '@/lib/google-workspace/oauth-state'
import { saveGoogleTokens } from '@/lib/google-workspace/token-store'

export const dynamic = 'force-dynamic'

function settingsUrl(request: NextRequest, status: string) {
  const url = new URL('/settings', request.url)
  url.searchParams.set('google', status)
  return url
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')
  const oauthError = request.nextUrl.searchParams.get('error')
  const sealed = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value
  const payload = openOAuthState(sealed)

  if (oauthError) return NextResponse.redirect(settingsUrl(request, 'denied'))
  if (!code || !returnedState || !payload || payload.state !== returnedState) {
    return NextResponse.redirect(settingsUrl(request, 'invalid-state'))
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, payload.verifier)
    await saveGoogleTokens(payload.uid, tokens)
    const response = NextResponse.redirect(settingsUrl(request, 'connected'))
    response.cookies.delete(GOOGLE_OAUTH_COOKIE)
    return response
  } catch {
    const response = NextResponse.redirect(settingsUrl(request, 'error'))
    response.cookies.delete(GOOGLE_OAUTH_COOKIE)
    return response
  }
}
