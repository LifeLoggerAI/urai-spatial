const configuredApiOrigin = process.env.NEXT_PUBLIC_URAI_API_ORIGIN?.trim() ?? ''

function configuredHttpsOrigin() {
  if (!configuredApiOrigin) return ''
  const candidate = new URL(configuredApiOrigin)
  if (
    candidate.protocol !== 'https:'
    || candidate.username
    || candidate.password
    || candidate.pathname !== '/'
    || candidate.search
    || candidate.hash
  ) {
    throw new Error('NEXT_PUBLIC_URAI_API_ORIGIN must be a bare HTTPS origin.')
  }
  return candidate.origin
}

export function clientApiUrl(path: string) {
  if (!path.startsWith('/api/')) throw new Error('Client API paths must stay under /api/.')
  const origin = configuredHttpsOrigin()
  return origin ? new URL(path, `${origin}/`).toString() : path
}
