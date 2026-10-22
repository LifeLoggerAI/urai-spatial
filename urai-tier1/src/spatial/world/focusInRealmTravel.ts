import type { UraiWorldTravelRequest } from './worldTypes'

// This is a presentation routing decision, never access authorization.
// The destination Focus useSelectedMemory hook revalidates every selection.
export function isFocusInRealmTravel(
  request: Pick<UraiWorldTravelRequest, 'destination' | 'entryPortal' | 'href'>,
  pathname: string,
): boolean {
  if (pathname.replace(/\/+$/, '') !== '/focus'
      || request.destination !== 'focus'
      || request.entryPortal !== 'focus-neighbor-star'
      || !request.href?.startsWith('/focus?')) return false
  const target = new URL(request.href, 'https://urai.invalid')
  const validToken = (value: string | null) => Boolean(value && /^[A-Za-z0-9._:-]{1,120}$/.test(value))
  const node = target.searchParams.get('node')
  const memory = target.searchParams.get('memoryId')
  if (!validToken(node) || !validToken(memory)) return false
  if (target.searchParams.get('demo') === '1') return !target.searchParams.has('manifestId')
  return validToken(target.searchParams.get('manifestId'))
}
