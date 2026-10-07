'use client'

import { Capacitor } from '@capacitor/core'
import { getAuth, OAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import { app } from '@/lib/firebase/client'
import { prepareAppleAccountDeletion } from '@/lib/firebase/appleDeletionPolicy'

export async function appleCredentialForAccountDeletion() {
  const auth = getAuth(app)
  const user = auth.currentUser
  if (!user) throw new Error('ACCOUNT_AUTHORITY_REQUIRED')
  const assertCurrentUser = () => {
    if (auth.currentUser?.uid !== user.uid) throw new Error('ACCOUNT_AUTHORITY_CHANGED')
  }
  const credential = await prepareAppleAccountDeletion({
    appleLinked: user.providerData.some((provider) => provider.providerId === 'apple.com'),
    native: Capacitor.isNativePlatform(), platform: Capacitor.getPlatform(),
    nativeConfigured: process.env.NEXT_PUBLIC_URAI_IOS_APPLE_AUTH_READY === 'true' && Capacitor.isPluginAvailable('FirebaseAuthentication'),
  }, {
    assertCurrentUser,
    native: async () => {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true })
      return { idToken: result.credential?.idToken, nonce: result.credential?.nonce, authorizationCode: result.credential?.authorizationCode }
    },
    reauthenticate: async (idToken, rawNonce) => {
      await reauthenticateWithCredential(user, new OAuthProvider('apple.com').credential({ idToken, rawNonce }))
    },
    web: async () => {
      const result = await reauthenticateWithPopup(user, new OAuthProvider('apple.com'))
      return OAuthProvider.credentialFromResult(result)?.accessToken
    },
  })
  assertCurrentUser()
  if (credential) await user.getIdToken(true)
  assertCurrentUser()
  return credential
}
