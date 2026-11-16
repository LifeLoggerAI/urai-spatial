/**
 * Browser-side Firebase configuration completeness check.
 *
 * Public SDK keys identify a Firebase app; their presence is never proof
 * of consent, backend reachability, IAM, or permission to write private data.
 * Do not enable the private journey until the app and Storage identities
 * needed by the full Genesis flow are available.
 */
export const REQUIRED_FIREBASE_BROWSER_KEYS = Object.freeze([
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
] as const)

export function isFirebaseBrowserConfigReady(values: Readonly<Record<string, string | undefined>>): boolean {
  return REQUIRED_FIREBASE_BROWSER_KEYS.every((key) =>
    typeof values[key] === 'string' && values[key]!.trim().length > 0
  )
}
