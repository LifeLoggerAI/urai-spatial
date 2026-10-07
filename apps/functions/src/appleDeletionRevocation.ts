export type AppleRevocationEvidence = {
  providerId: 'apple.com'
  state: 'revoked'
  revokedAtMs: number
  authenticatedAtSeconds: number
}

type VerifiedToken = { uid: string; aud: string; iss: string; auth_time?: number; firebase?: { sign_in_provider?: string; identities?: Record<string, unknown> } }
type RevocationCredential = { tokenType?: unknown; token?: unknown } | undefined
type RevocationActions = { verifyIdToken: (token: string) => Promise<VerifiedToken>; fetch: typeof fetch; now: () => number }

function validSecret(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && !/\s/.test(value)
}

// The server owns the successful provider response. A client status/boolean
// cannot create revocation evidence. No credential or upstream body is logged.
export async function revokeAppleForAccountDeletion(
  input: { uid: string; appleProviderUid: string; bearerToken: string; credential: RevocationCredential; publicApiKey: string },
  actions: RevocationActions,
): Promise<AppleRevocationEvidence> {
  if (!validSecret(input.bearerToken, 16384) || !/^AIza[A-Za-z0-9_-]{35}$/.test(input.publicApiKey)) throw new Error('APPLE_REVOCATION_CONFIGURATION_REQUIRED')
  if (!['CODE', 'ACCESS_TOKEN'].includes(String(input.credential?.tokenType)) || !validSecret(input.credential?.token, 8192)) throw new Error('APPLE_REVOCATION_CREDENTIAL_REQUIRED')
  const decoded = await actions.verifyIdToken(input.bearerToken)
  const now = actions.now()
  const authenticatedAtSeconds = Number(decoded.auth_time)
  const identities = decoded.firebase?.identities?.['apple.com']
  if (decoded.uid !== input.uid || decoded.aud !== 'urai-4dc1d' || decoded.iss !== 'https://securetoken.google.com/urai-4dc1d' || decoded.firebase?.sign_in_provider !== 'apple.com' || !Array.isArray(identities) || !identities.includes(input.appleProviderUid)) {
    throw new Error('APPLE_REVOCATION_ACCOUNT_MISMATCH')
  }
  if (!Number.isFinite(authenticatedAtSeconds) || authenticatedAtSeconds <= 0 || now / 1000 - authenticatedAtSeconds > 300 || authenticatedAtSeconds - now / 1000 > 30) throw new Error('APPLE_REVOCATION_RECENT_AUTH_REQUIRED')
  const endpoint = new URL('https://identitytoolkit.googleapis.com/v2/accounts:revokeToken')
  endpoint.searchParams.set('key', input.publicApiKey)
  try {
    const response = await actions.fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error',
      signal: AbortSignal.timeout(10000), cache: 'no-store',
      body: JSON.stringify({ providerId: 'apple.com', tokenType: input.credential!.tokenType === 'CODE' ? 3 : 'ACCESS_TOKEN', token: input.credential!.token, idToken: input.bearerToken }),
    })
    // Native CODE uses the same numeric type and absent redirectUri as the
    // official Firebase iOS RevokeTokenRequest. Web grants use ACCESS_TOKEN.
    if (!response.ok) throw new Error('APPLE_REVOCATION_FAILED')
  } catch { throw new Error('APPLE_REVOCATION_FAILED') }
  return { providerId: 'apple.com', state: 'revoked', revokedAtMs: actions.now(), authenticatedAtSeconds }
}

export function assertAppleDeletionMayComplete(appleLinked: boolean, evidence: unknown, lastSignInTime?: string) {
  if (!appleLinked) return
  const receipt = evidence as Partial<AppleRevocationEvidence> | null | undefined
  if (receipt?.providerId !== 'apple.com' || receipt.state !== 'revoked' || !Number.isFinite(receipt.revokedAtMs) || receipt.revokedAtMs! <= 0 || !Number.isFinite(receipt.authenticatedAtSeconds) || receipt.authenticatedAtSeconds! <= 0) throw new Error('APPLE_REVOCATION_REQUIRED_BEFORE_DELETION')
  const latestSignIn = Date.parse(lastSignInTime ?? '')
  if (!Number.isFinite(latestSignIn) || latestSignIn > receipt.revokedAtMs!) throw new Error('APPLE_SIGN_IN_AFTER_REVOCATION_REQUIRES_NEW_DELETION_REQUEST')
}
