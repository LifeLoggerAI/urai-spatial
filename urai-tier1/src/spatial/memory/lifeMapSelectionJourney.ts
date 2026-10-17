import { buildNamedExplicitDemoMemory } from './explicitDemoMemory'
import { sanitizeMemoryId } from './selectedMemoryContract'

// Query metadata is scoped to the selected memory. A prior star's manifest
// cannot become authority for a newly selected private memory.
export function withLifeMapSelectionIdentity(current: URLSearchParams, next: URLSearchParams, selectedMemoryId?: string) {
  const currentMemoryId = sanitizeMemoryId(current.get('memoryId') ?? current.get('node'))
  const targetMemoryId = sanitizeMemoryId(selectedMemoryId ?? currentMemoryId)
  if (current.get('demo') === '1') {
    next.set('demo', '1')
    if (targetMemoryId) {
      const demoId = targetMemoryId.startsWith('demo:') ? targetMemoryId : `demo:${targetMemoryId}`
      next.set('manifestId', buildNamedExplicitDemoMemory(demoId).replayManifest.id)
    } else next.delete('manifestId')
  } else {
    const manifestId = sanitizeMemoryId(current.get('manifestId'))
    if (manifestId && (!selectedMemoryId || targetMemoryId === currentMemoryId)) next.set('manifestId', manifestId)
    else next.delete('manifestId')
  }
  for (const flag of ['onboarding', 'firstRun']) {
    if (current.get(flag) === '1') next.set(flag, '1')
  }
  return next
}
