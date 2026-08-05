import { buildOrbCompanionResponse } from '@/lib/orb-companion-contract'
import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

export type OrbConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type OrbProviderResult = {
  message: string
  caption: string
  disclosure: string
  suggestedActions: string[]
  provider: 'openai' | 'fallback'
}

export type OrbProviderEvent =
  | { type: 'status'; status: string }
  | { type: 'delta'; text: string }
  | ({ type: 'done' } & OrbProviderResult)
  | { type: 'error'; code: string; message: string }

export function deterministicOrbFallback(message = ''): OrbProviderResult {
  const fallback = buildOrbCompanionResponse({ message })
  return {
    message: fallback.reply,
    caption: fallback.reply,
    disclosure: 'Deterministic local fallback — no external AI provider processed this message.',
    suggestedActions: fallback.routeHint ? [`Open ${fallback.routeHint}`, 'Review privacy controls'] : ['Pause here', 'Review privacy controls'],
    provider: 'fallback',
  }
}

export async function requestOpenAIOrb(input: {
  message: string
  context: OrbConversationMessage[]
  aiProcessingConsent: boolean
  signal: AbortSignal
  onEvent?: (event: OrbProviderEvent) => void
}): Promise<OrbProviderResult | null> {
  if (!input.aiProcessingConsent || !firebasePublicEnvReady || input.signal.aborted) return null
  const user = getAuth(app).currentUser
  if (!user) return null
  const token = await user.getIdToken()
  if (!token || input.signal.aborted) return null

  const response = await fetch('/api/urai/orb/openai', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: input.signal,
    body: JSON.stringify({
      message: input.message,
      context: input.context.slice(-8),
      aiProcessingConsent: true,
    }),
  })

  if (!response.ok || !response.body) return null
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: OrbProviderResult | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let event: OrbProviderEvent
      try { event = JSON.parse(line) as OrbProviderEvent } catch { continue }
      input.onEvent?.(event)
      if (event.type === 'done') finalResult = event
      if (event.type === 'error') return null
    }
  }

  return finalResult
}
