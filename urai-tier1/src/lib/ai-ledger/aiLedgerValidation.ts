import type { AILedgerEntry } from './aiLedgerTypes'

const FORBIDDEN_REASONING_KEYS = new Set([
  'chainOfThought',
  'chain_of_thought',
  'hiddenReasoning',
  'hidden_reasoning',
  'reasoningTokens',
  'reasoning_tokens',
])

export function validateAILedgerEntry(entry: AILedgerEntry): readonly string[] {
  const errors: string[] = []
  if (entry.schemaVersion !== 1) errors.push('AI_LEDGER_SCHEMA_INVALID')
  if (!entry.entryId || !entry.ownerId || !entry.operationId) errors.push('AI_LEDGER_IDENTITY_REQUIRED')
  if (!entry.inputHash || !entry.outputHash) errors.push('AI_LEDGER_HASH_REQUIRED')
  if (entry.provider && (!entry.model || !entry.modelVersion)) errors.push('AI_LEDGER_PROVIDER_REQUIRES_EXACT_MODEL_VERSION')
  if (entry.excludedRefs.length !== entry.exclusionReasons.length) errors.push('AI_LEDGER_EXCLUSION_REASON_MISMATCH')
  for (const key of Object.keys(entry as unknown as Record<string, unknown>)) {
    if (FORBIDDEN_REASONING_KEYS.has(key)) errors.push(`AI_LEDGER_HIDDEN_REASONING_FORBIDDEN:${key}`)
  }
  return errors
}

export function sanitizeLedgerPayload<T extends Record<string, unknown>>(payload: T) {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) if (!FORBIDDEN_REASONING_KEYS.has(key)) next[key] = value
  return next as Omit<T, 'chainOfThought' | 'hiddenReasoning'>
}
