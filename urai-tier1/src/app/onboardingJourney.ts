import { sanitizeMemoryId, type SelectedMemoryResult } from '@/spatial/memory/selectedMemoryContract'

function requestedMemoryId(params: URLSearchParams) {
  if (params.get('overview') === '1') return null
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? params.get('node'))
  const node = params.get('node')
  if (!memoryId || (node && node !== memoryId)) return null
  return memoryId
}

export function guidedFocusHref(params: URLSearchParams, result: SelectedMemoryResult): string | null {
  const memoryId = requestedMemoryId(params)
  if (!memoryId || (result.status !== 'ready' && result.status !== 'demo')) return null
  const memory = result.memory
  const expectedId = result.status === 'demo' && !memoryId.startsWith('demo:') ? `demo:${memoryId}` : memoryId
  if (memory.id !== expectedId || memory.demo !== (result.status === 'demo')) return null
  if (memory.demo && params.get('demo') !== '1') return null
  const manifestId = sanitizeMemoryId(memory.replayManifest.id)
  if (!manifestId || (params.has('manifestId') && params.get('manifestId') !== manifestId)) return null
  const next = new URLSearchParams({ memoryId, node: memoryId, manifestId, returnNode: memoryId, from: 'life-map-onboarding', onboarding: '1' })
  if (memory.demo) next.set('demo', '1')
  return `/focus?${next.toString()}`
}

export function guidedCardHref(href: string, params: URLSearchParams): string {
  const destination = new URL(href, 'https://urai.app')
  if (params.get('demo') === '1') destination.searchParams.set('demo', '1')
  return `${destination.pathname}${destination.search}`
}

export function guidedFocusArrived(params: URLSearchParams, result: SelectedMemoryResult, dataset: DOMStringMap): boolean {
  if (params.get('onboarding') !== '1' && params.get('firstRun') !== '1') return false
  if (!guidedFocusHref(params, result) || !result.memory) return false
  return dataset.memoryStatus === result.status
    && dataset.chamberState === 'ready'
    && dataset.memoryId === result.memory.id
    && dataset.manifestId === result.memory.replayManifest.id
}
