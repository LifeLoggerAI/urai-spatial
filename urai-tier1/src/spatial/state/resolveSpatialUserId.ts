export function resolveSpatialUserId(): string | null {
  const env = process.env.NEXT_PUBLIC_URAI_USER_ID?.trim()
  if (env) return env
  if (typeof window !== 'undefined') {
    const local = window.localStorage.getItem('urai:userId')?.trim()
    if (local) return local
  }
  return null
}
