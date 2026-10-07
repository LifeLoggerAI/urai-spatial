export type AppleRevocationCredential = { tokenType: 'CODE' | 'ACCESS_TOKEN'; token: string }
type AppleIdentityCredential = { idToken?: string | null; nonce?: string | null; authorizationCode?: string | null }

// Reauthentication validates the Apple identity against the existing JS user.
// Provider credentials live only for this request and are never saved or logged.
export async function prepareAppleAccountDeletion(
  environment: { appleLinked: boolean; native: boolean; platform: string; nativeConfigured: boolean },
  actions: {
    native: () => Promise<AppleIdentityCredential>
    reauthenticate: (idToken: string, rawNonce: string) => Promise<void>
    web: () => Promise<string | null | undefined>
    assertCurrentUser: () => void
  },
): Promise<AppleRevocationCredential | undefined> {
  if (!environment.appleLinked) return undefined
  actions.assertCurrentUser()
  if (!environment.native) {
    const token = await actions.web()
    actions.assertCurrentUser()
    if (typeof token !== 'string' || !token.trim()) throw new Error('APPLE_DELETION_CREDENTIAL_REQUIRED')
    return { tokenType: 'ACCESS_TOKEN', token }
  }
  if (environment.platform !== 'ios' || !environment.nativeConfigured) throw new Error('APPLE_DELETION_NATIVE_CONFIGURATION_REQUIRED')
  const credential = await actions.native()
  actions.assertCurrentUser()
  for (const value of [credential.idToken, credential.nonce, credential.authorizationCode]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('APPLE_DELETION_CREDENTIAL_REQUIRED')
  }
  await actions.reauthenticate(credential.idToken!, credential.nonce!)
  actions.assertCurrentUser()
  return { tokenType: 'CODE', token: credential.authorizationCode! }
}
