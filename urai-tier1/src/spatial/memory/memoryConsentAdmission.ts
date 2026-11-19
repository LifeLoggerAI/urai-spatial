// Private memories are visible only when the owner's current canonical
// memory-domain consent is loaded and fully enforced. Demo never reads this.
export type MemoryConsentAdmission = 'pending' | 'allowed' | 'denied'

export function memoryConsentAdmission(
  exists: boolean,
  raw: Record<string, unknown> | null,
  expectedUid: string,
): MemoryConsentAdmission {
  if (!exists || !raw || raw.ownerId !== expectedUid) return 'denied'
  const domains = raw.domains
  if (!domains || typeof domains !== 'object') return 'denied'
  const memory = (domains as Record<string, unknown>).memory
  if (!memory || typeof memory !== 'object') return 'denied'
  const mode = (memory as Record<string, unknown>).mode
  if (mode !== 'granted' && mode !== 'limited') return 'denied'
  const enforcement = raw.enforcement
  if (!enforcement || typeof enforcement !== 'object') return 'denied'
  const state = (enforcement as Record<string, unknown>).state
  if (state === 'pending' || state === 'partially-enforced') return 'denied'
  if (state !== 'fully-enforced') return 'denied'
  return 'allowed'
}
