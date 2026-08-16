import { NextRequest, NextResponse } from 'next/server'
import { exchangeGoogleAuthorizationCode } from '@/lib/google-workspace/oauth'
import { GOOGLE_OAUTH_COOKIE, openOAuthState } from '@/lib/google-workspace/oauth-state'
import { saveGoogleTokens } from '@/lib/google-workspace/token-store'

type CallbackBody = {
  code?: unknown
  state?: unknown
  error?: unknown
}

function callbackResponse(status: string, httpStatus = 200) {
  const response = NextResponse.json(
    { redirectTo: `/settings?google=${encodeURIComponent(status)}` },
    { status: httpStatus },
  )
  response.cookies.delete(GOOGLE_OAUTH_COOKIE)
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as CallbackBody | null
  const code = typeof body?.code === 'string' ? body.code : null
  const returnedState = typeof body?.state === 'string' ? body.state : null
  const oauthError = typeof body?.error === 'string' ? body.error : null
  const sealed = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value
  const payload = openOAuthState(sealed)

  if (oauthError) return callbackResponse('denied')
  if (!code || !returnedState || !payload || payload.state !== returnedState) {
    return callbackResponse('invalid-state', 400)
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, payload.verifier)
    await saveGoogleTokens(payload.uid, tokens)
    return callbackResponse('connected')
  } catch {
    return callbackResponse('error', 500)
  }
}
