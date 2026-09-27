import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

export type TranscriptionResult = {
  text: string
  provider: 'openai'
  synthetic: false
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

export async function requestOpenAITranscription(input: {
  audio: Blob
  externalProcessingConsent: boolean
  language?: string
  signal?: AbortSignal
}): Promise<TranscriptionResult | null> {
  if (!input.externalProcessingConsent || !firebasePublicEnvReady || input.signal?.aborted) return null
  if (!input.audio.size || input.audio.size > 8 * 1024 * 1024) return null

  const user = getAuth(app).currentUser
  if (!user) return null
  const token = await user.getIdToken()
  if (!token || input.signal?.aborted) return null

  const bytes = new Uint8Array(await input.audio.arrayBuffer())
  if (input.signal?.aborted) return null

  try {
    const response = await fetch('/api/audio/transcribe', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: input.signal,
      body: JSON.stringify({
        audioBase64: bytesToBase64(bytes),
        mimeType: input.audio.type || 'audio/webm',
        language: input.language,
        externalProcessingConsent: true,
      }),
    })
    if (!response.ok || input.signal?.aborted) return null
    const payload = await response.json() as Partial<TranscriptionResult>
    const text = String(payload.text ?? '').trim()
    if (!text || payload.provider !== 'openai' || payload.synthetic !== false) return null
    return { text, provider: 'openai', synthetic: false }
  } catch {
    return null
  }
}
