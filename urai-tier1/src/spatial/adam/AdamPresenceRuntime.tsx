'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import {
  AdamProviderError,
  requestAdamFounderVoice,
  requestAdamPresence,
  type AdamConversationMessage,
  type AdamProviderResult,
} from './adamClient'
import { resolveAdamSurface } from './adamSurfaceContext'
import styles from './AdamPresenceRuntime.module.css'

type DisplayMessage = AdamConversationMessage & {
  id: string
  requiresHumanFounder?: boolean
  handoffReason?: string
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `adam-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function nextSpeakableChunk(buffer: string, final: boolean): [string | null, string] {
  const trimmed = buffer.trimStart()
  if (!trimmed) return [null, '']
  const sentence = trimmed.match(/^([\s\S]{24,260}?[.!?])(?:\s|$)/)
  if (sentence) return [sentence[1].trim(), trimmed.slice(sentence[0].length)]
  if (trimmed.length > 300) {
    const cut = Math.max(trimmed.lastIndexOf(' ', 260), 180)
    return [trimmed.slice(0, cut).trim(), trimmed.slice(cut)]
  }
  if (final) return [trimmed, '']
  return [null, trimmed]
}

export default function AdamPresenceRuntime() {
  const pathname = usePathname()
  const surface = resolveAdamSurface(pathname)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [streamedText, setStreamedText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [aiConsent, setAiConsent] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [status, setStatus] = useState('Adam is ready when you are.')
  const conversationAborter = useRef<AbortController | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const currentAudio = useRef<HTMLAudioElement | null>(null)
  const voiceControllers = useRef(new Set<AbortController>())
  const voiceQueue = useRef(Promise.resolve())
  const voiceGeneration = useRef(0)
  const streamingSpeechBuffer = useRef('')

  const stopVoice = useCallback(() => {
    voiceGeneration.current += 1
    for (const controller of voiceControllers.current) controller.abort()
    voiceControllers.current.clear()
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current.currentTime = 0
      currentAudio.current.src = ''
      currentAudio.current = null
    }
    streamingSpeechBuffer.current = ''
  }, [])

  const stopAll = useCallback(() => {
    conversationAborter.current?.abort()
    conversationAborter.current = null
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    stopVoice()
    setBusy(false)
    setStatus('Stopped.')
  }, [stopVoice])

  useEffect(() => () => stopAll(), [stopAll])
  useEffect(() => {
    stopVoice()
    setStreamedText('')
    if (pathname === '/adam') setOpen(true)
  }, [pathname, stopVoice])

  const playAudio = useCallback((blob: Blob, generation: number) => new Promise<void>((resolve) => {
    if (generation !== voiceGeneration.current) return resolve()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio.current = audio
    const finish = () => {
      URL.revokeObjectURL(url)
      if (currentAudio.current === audio) currentAudio.current = null
      resolve()
    }
    audio.onended = finish
    audio.onerror = finish
    void audio.play().catch(finish)
  }), [])

  const enqueueSpeech = useCallback((text: string) => {
    if (!voiceConsent || voiceMuted || !text.trim()) return
    const generation = voiceGeneration.current
    voiceQueue.current = voiceQueue.current.then(async () => {
      if (generation !== voiceGeneration.current) return
      const controller = new AbortController()
      voiceControllers.current.add(controller)
      try {
        const result = await requestAdamFounderVoice({
          text: text.trim(),
          externalProcessingConsent: true,
          signal: controller.signal,
        })
        if (generation !== voiceGeneration.current) return
        if (!result.blob) {
          if (result.errorCode === 'FOUNDER_VOICE_NOT_READY' || result.errorCode === 'FOUNDER_VOICE_ID_MISSING') {
            setStatus('Adam text is live. The accepted private Founder voice is not enabled yet.')
          } else {
            setStatus('Adam text is live. Voice is temporarily unavailable.')
          }
          return
        }
        setStatus('Adam is speaking.')
        await playAudio(result.blob, generation)
      } catch {
        if (!controller.signal.aborted) setStatus('Adam text is live. Voice is temporarily unavailable.')
      } finally {
        voiceControllers.current.delete(controller)
      }
    })
  }, [playAudio, voiceConsent, voiceMuted])

  const drainSpeechBuffer = useCallback((final: boolean) => {
    if (!voiceConsent || voiceMuted) {
      streamingSpeechBuffer.current = ''
      return
    }
    let remaining = streamingSpeechBuffer.current
    while (true) {
      const [chunk, rest] = nextSpeakableChunk(remaining, final)
      remaining = rest
      if (!chunk) break
      enqueueSpeech(chunk)
      if (!final) break
    }
    streamingSpeechBuffer.current = remaining
  }, [enqueueSpeech, voiceConsent, voiceMuted])

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    stopVoice()
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Constructor) {
      setStatus('Voice input is not available in this browser. Type to Adam instead.')
      return
    }
    recognitionRef.current?.abort()
    const recognition = new Constructor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'
    recognition.onresult = (event) => {
      let text = ''
      for (let index = 0; index < event.results.length; index += 1) text += event.results[index][0]?.transcript ?? ''
      setMessage(text.trimStart())
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
      setStatus('Voice captured. Send when ready.')
    }
    recognition.onerror = () => {
      setListening(false)
      recognitionRef.current = null
      setStatus('Voice input stopped. You can type instead.')
    }
    recognitionRef.current = recognition
    setListening(true)
    setStatus('Listening…')
    recognition.start()
  }, [stopVoice])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (!surface || !text || busy || !aiConsent) return

    stopVoice()
    const controller = new AbortController()
    conversationAborter.current = controller
    setBusy(true)
    setStreamedText('')
    streamingSpeechBuffer.current = ''
    setStatus('Adam is thinking…')

    const priorContext = messages.slice(-10).map(({ role, content }) => ({ role, content }))
    const userMessage: DisplayMessage = { id: uid(), role: 'user', content: text }
    setMessages((current) => [...current, userMessage])
    setMessage('')

    try {
      const result = await requestAdamPresence({
        message: text,
        context: priorContext,
        surface: surface.id,
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
        aiProcessingConsent: true,
        signal: controller.signal,
        onEvent: (providerEvent) => {
          if (providerEvent.type !== 'delta') return
          setStreamedText((current) => current + providerEvent.text)
          streamingSpeechBuffer.current += providerEvent.text
          drainSpeechBuffer(false)
        },
      })
      drainSpeechBuffer(true)
      const adamMessage: DisplayMessage = {
        id: uid(),
        role: 'assistant',
        content: result.caption,
        requiresHumanFounder: result.requiresHumanFounder,
        handoffReason: result.handoffReason,
      }
      setMessages((current) => [...current, adamMessage])
      setStreamedText('')
      setStatus(result.requiresHumanFounder ? 'This needs the human founder.' : voiceConsent && !voiceMuted ? 'Adam response complete.' : 'Adam responded.')
    } catch (error) {
      setStreamedText('')
      if (controller.signal.aborted) {
        setStatus('Stopped.')
      } else if (error instanceof AdamProviderError) {
        setStatus(error.message)
      } else {
        setStatus('Adam is temporarily unavailable.')
      }
    } finally {
      if (conversationAborter.current === controller) conversationAborter.current = null
      setBusy(false)
    }
  }

  if (!surface) return null

  if (!open) {
    return (
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-label={`Talk with Adam in ${surface.label}`}
        data-urai-adam-launcher="true"
      >
        Adam
      </button>
    )
  }

  const visibleMessages = streamedText
    ? [...messages, { id: 'streaming', role: 'assistant' as const, content: streamedText }]
    : messages

  return (
    <aside
      className={styles.panel}
      aria-label="Adam founder presence"
      data-urai-adam-presence="runtime-v1"
      data-adam-surface={surface.id}
      data-adam-identity="founder-digital-presence"
    >
      <header className={styles.header}>
        <div className={styles.presence} aria-hidden="true">A</div>
        <div className={styles.identity}>
          <p className={styles.name}>Adam</p>
          <p className={styles.surface}>{surface.label} · {busy ? 'thinking' : listening ? 'listening' : 'present'}</p>
        </div>
        <button type="button" className={styles.close} onClick={() => { stopAll(); setOpen(false) }} aria-label="Close Adam">×</button>
      </header>

      <details className={styles.about}>
        <summary>About Adam</summary>
        <p>Adam is UrAi’s digital Founder presence. The human founder remains required for binding founder, legal, financial, governance, and other explicitly human decisions.</p>
      </details>

      <div className={styles.log} role="log" aria-live="polite" aria-relevant="additions text">
        {visibleMessages.length ? visibleMessages.map((item) => (
          <div key={item.id} className={`${styles.message} ${item.role === 'user' ? styles.user : styles.adam}`}>
            <strong>{item.role === 'user' ? 'You' : 'Adam'}</strong>
            <div>{item.content}</div>
            {item.role === 'assistant' && item.requiresHumanFounder ? (
              <div className={styles.handoff}>Human founder required{item.handoffReason ? `: ${item.handoffReason}` : '.'}</div>
            ) : null}
          </div>
        )) : (
          <div className={`${styles.message} ${styles.adam}`}>
            <strong>Adam</strong>
            <div>Ask me about UrAi, where you are, or what to do next.</div>
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          className={styles.textarea}
          value={message}
          rows={3}
          maxLength={2500}
          onChange={(event) => setMessage(event.target.value)}
          onFocus={() => {
            if (currentAudio.current) stopVoice()
          }}
          placeholder="Talk to Adam…"
          aria-label="Message Adam"
        />
        <div className={styles.options}>
          <label>
            <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} />
            Allow this message and bounded recent context to use the configured AI provider.
          </label>
          <label>
            <input
              type="checkbox"
              checked={voiceConsent}
              onChange={(event) => {
                const allowed = event.target.checked
                setVoiceConsent(allowed)
                if (!allowed) stopVoice()
              }}
            />
            Allow Adam’s accepted private Founder voice provider for this session.
          </label>
        </div>
        <div className={styles.controls}>
          <button type="submit" disabled={busy || !message.trim() || !aiConsent}>Send</button>
          <button type="button" onClick={startListening} disabled={busy || listening}>{listening ? 'Listening…' : 'Talk'}</button>
          <button
            type="button"
            aria-pressed={voiceMuted}
            onClick={() => {
              const next = !voiceMuted
              setVoiceMuted(next)
              if (next) stopVoice()
            }}
          >
            {voiceMuted ? 'Voice off' : 'Mute voice'}
          </button>
          <button type="button" onClick={stopAll} disabled={!busy && !listening && !currentAudio.current}>Stop</button>
        </div>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
      </form>
    </aside>
  )
}
