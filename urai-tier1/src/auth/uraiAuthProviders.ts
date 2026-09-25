import {
  FacebookAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  type AuthProvider,
} from 'firebase/auth'

export type UraiAuthProviderId = 'google' | 'apple' | 'microsoft' | 'github' | 'facebook'

export type UraiAuthProviderDefinition = {
  id: UraiAuthProviderId
  label: string
  enabled: boolean
  note: string
}

const explicitlyEnabled = (value: string | undefined) => value === 'true'

export const URAI_AUTH_PROVIDERS: readonly UraiAuthProviderDefinition[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    enabled: process.env.NEXT_PUBLIC_URAI_AUTH_GOOGLE_ENABLED !== 'false',
    note: 'Google identity only. Workspace history is a separate optional connection.',
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    enabled: explicitlyEnabled(process.env.NEXT_PUBLIC_URAI_AUTH_APPLE_ENABLED),
    note: 'Available only after the Apple identity provider is configured and approved.',
  },
  {
    id: 'microsoft',
    label: 'Continue with Microsoft',
    enabled: explicitlyEnabled(process.env.NEXT_PUBLIC_URAI_AUTH_MICROSOFT_ENABLED),
    note: 'Microsoft identity only. Outlook or Microsoft 365 history requires separate import consent.',
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    enabled: explicitlyEnabled(process.env.NEXT_PUBLIC_URAI_AUTH_GITHUB_ENABLED),
    note: 'Available only after the GitHub identity provider is configured and approved.',
  },
  {
    id: 'facebook',
    label: 'Continue with Facebook',
    enabled: explicitlyEnabled(process.env.NEXT_PUBLIC_URAI_AUTH_FACEBOOK_ENABLED),
    note: 'Facebook identity only. Social history is never imported by signing in.',
  },
] as const

export function configuredAuthProviders() {
  return URAI_AUTH_PROVIDERS.filter((provider) => provider.enabled)
}

export function buildAuthProvider(id: UraiAuthProviderId): AuthProvider {
  switch (id) {
    case 'google': {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      return provider
    }
    case 'apple':
      return new OAuthProvider('apple.com')
    case 'microsoft': {
      const provider = new OAuthProvider('microsoft.com')
      provider.setCustomParameters({ prompt: 'select_account' })
      return provider
    }
    case 'github':
      return new GithubAuthProvider()
    case 'facebook':
      return new FacebookAuthProvider()
  }
}
