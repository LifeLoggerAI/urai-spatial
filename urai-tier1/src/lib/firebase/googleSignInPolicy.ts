export class NativeGoogleSignInUnavailable extends Error {
  constructor() {
    super('Secure sign-in is not configured for this device build. Your private world remains closed.')
    this.name = 'NativeGoogleSignInUnavailable'
  }
}

type GoogleSignInEnvironment = {
  native: boolean
  platform: string
  nativeConfigured: boolean
}

type GoogleSignInActions<T> = {
  web: () => Promise<T>
  native: () => Promise<string | null | undefined>
  exchange: (idToken: string) => Promise<T>
}

// Google does not allow OAuth sign-in inside an embedded WebView. Native
// credentials are exchanged by the existing Firebase JS account authority;
// no native error or missing configuration may fall through to a web popup.
export async function performUraiGoogleSignIn<T>(
  environment: GoogleSignInEnvironment,
  actions: GoogleSignInActions<T>,
): Promise<T> {
  if (!environment.native) return actions.web()
  if (!['android', 'ios'].includes(environment.platform) || !environment.nativeConfigured) {
    throw new NativeGoogleSignInUnavailable()
  }
  const idToken = await actions.native()
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('Native Google sign-in did not return an identity credential.')
  }
  return actions.exchange(idToken)
}

// Close the authoritative JS session first. A device chooser reset failure
// cannot keep a private Firebase session open or reopen the provider popup.
export async function performUraiGoogleSignOut(
  environment: GoogleSignInEnvironment,
  actions: { closeSession: () => Promise<void>; resetNativeAccount: () => Promise<void> },
): Promise<boolean> {
  await actions.closeSession()
  if (!environment.native || !['android', 'ios'].includes(environment.platform) || !environment.nativeConfigured) return true
  try {
    await actions.resetNativeAccount()
    return true
  } catch {
    return false
  }
}

export async function performUraiAppleSignIn<T>(
  environment: GoogleSignInEnvironment,
  actions: { native: () => Promise<{ idToken?: string | null; nonce?: string | null }>; exchange: (idToken: string, rawNonce: string) => Promise<T> },
): Promise<T> {
  if (!environment.native || environment.platform !== 'ios' || !environment.nativeConfigured) throw new NativeGoogleSignInUnavailable()
  const credential = await actions.native()
  if (typeof credential.idToken !== 'string' || !credential.idToken.trim() || typeof credential.nonce !== 'string' || !credential.nonce.trim()) throw new Error('Native Apple sign-in did not return a nonce-bound identity credential.')
  return actions.exchange(credential.idToken, credential.nonce)
}
