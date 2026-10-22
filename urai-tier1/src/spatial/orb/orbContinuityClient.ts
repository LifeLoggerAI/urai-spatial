import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'
import { isCurrentAIActorSnapshot, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'
import type { OrbConversationMessage } from './openaiClient'

export type OrbContinuityInput =
  | { action: 'read' | 'disable' }
  | { action: 'clear'; epoch: string }
  | { action: 'enable'; seed: OrbConversationMessage[]; epoch: string | null }
  | { action: 'append'; epoch: string; turnId: string; userMessage: string; assistantMessage: string }
export type OrbContinuityState = {
  enabled: boolean
  epoch: string | null
  revision: number
  messages: OrbConversationMessage[]
}

function cleanState(value: unknown): OrbContinuityState {
  if (!value || typeof value !== 'object') throw new Error('Invalid Orb continuity response.')
  const object = value as Record<string, unknown>
  if (typeof object.enabled !== 'boolean' || !Number.isSafeInteger(object.revision)
    || !Array.isArray(object.messages) || object.messages.length > 20
    || (object.epoch !== null && (typeof object.epoch !== 'string' || !/^[a-f0-9-]{36}$/.test(object.epoch)))
    || (object.enabled && typeof object.epoch !== 'string')) throw new Error('Invalid Orb continuity response.')
  const messages = object.messages.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid saved Orb message.')
    const message = item as Record<string, unknown>
    if ((message.role !== 'user' && message.role !== 'assistant')
      || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 2000) {
      throw new Error('Invalid saved Orb message.')
    }
    return { role: message.role as 'user' | 'assistant', content: message.content }
  })
  if (!object.enabled && messages.length) throw new Error('Disabled conversation still contains messages.')
  return { enabled: object.enabled, epoch: typeof object.epoch === 'string' ? object.epoch : null,
    revision: object.revision as number, messages }
}

export async function requestOrbContinuity(
  actor: AIActorSnapshot,
  input: OrbContinuityInput,
): Promise<OrbContinuityState | null> {
  if (!actor.uid || !actor.actor || !isCurrentAIActorSnapshot(actor)) return null
  const call = httpsCallable<OrbContinuityInput, unknown>(functions, 'orbConversationContinuity')
  const response = await call(input)
  // A signed-out, replaced, or switched identity can never hydrate another
  // identity's transcript even if the old server request completed.
  if (!isCurrentAIActorSnapshot(actor)) return null
  return cleanState(response.data)
}
