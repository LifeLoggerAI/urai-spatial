/** Shared identity for the semantic navigator and its mounted spatial world. */
export function lifeMapIdentitySearch(params: Pick<URLSearchParams, 'get'>) {
  const next = new URLSearchParams()
  if (params.get('demo') === '1') next.set('demo', '1')
  const manifestId = (params.get('manifestId') || 'replay-recovery-thread')
    .replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120)
  if (manifestId) next.set('manifestId', manifestId)
  return next
}
