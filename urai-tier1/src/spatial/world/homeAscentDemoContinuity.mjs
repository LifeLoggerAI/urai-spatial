// A disclosed demo journey is not an authentication grant. Keep it only across
// one physical Home-sky ascent to the Life Map; never infer it from a memory ID.
export function preserveExplicitHomeAscentDemo(target, request, startingLocation) {
  if (!(target instanceof URL) || !request || typeof startingLocation !== 'string') return target
  let starting
  try { starting = new URL(startingLocation) } catch { return target }
  const home = starting.pathname.replace(/\/+$/, '') || '/'
  const destination = target.pathname.replace(/\/+$/, '') || '/'
  if (home !== '/' && home !== '/home') return target
  if (target.origin !== starting.origin || destination !== '/life-map') return target
  if (request.destination !== 'life-map' || request.entryPortal !== 'home-sky'
      || request.cameraCheckpoint !== 'home-sky-ascent-complete') return target
  if (target.searchParams.has('demo')) return target
  // A prior selected/private memory is never an implicit demo admission.
  if (request.context?.memoryId || request.context?.replayManifestId) return target
  for (const key of ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId']) {
    if (starting.searchParams.has(key) || target.searchParams.has(key)) return target
  }
  const disclosed = starting.searchParams.getAll('demo')
  if (disclosed.length === 1 && disclosed[0] === '1') target.searchParams.set('demo', '1')
  return target
}
