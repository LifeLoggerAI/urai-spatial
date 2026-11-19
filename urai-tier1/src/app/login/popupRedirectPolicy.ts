/** Only popup availability errors may trigger provider redirect fallback. */
export function popupRequiresFullPageRedirect(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = (error as { code?: unknown }).code
  return code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment'
}
