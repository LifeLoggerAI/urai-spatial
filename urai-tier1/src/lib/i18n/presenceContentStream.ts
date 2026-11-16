import { contentLanguage, type UraiContentLanguageTag } from './contentLanguage'

type ContentResult = { message: string; caption: string; locale: UraiContentLanguageTag }
type EventRecord = Record<string, unknown>

// Validate before forwarding anything to captions or an accepted private voice queue.
export async function readPresenceContentStream<Result extends ContentResult, Event>(response: Response, options: {
  locale: UraiContentLanguageTag
  signal: AbortSignal
  onEvent?: (event: Event) => void
  validateDone: (event: EventRecord) => void
  error: (code: string, message: string) => Error
  incompleteCode: string
}): Promise<Result> {
  const invalid = () => options.error('INVALID_PROVIDER_RESPONSE', 'The presence response failed its content-language boundary.')
  if (!response.body) throw invalid()
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let buffer = '', streamed = '', finalResult: Result | null = null
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  options.signal.addEventListener('abort', cancel, { once: true })
  const accept = (line: string) => {
    if (options.signal.aborted) throw new DOMException('Presence request aborted.', 'AbortError')
    if (!line.trim()) return
    let value: unknown
    try { value = JSON.parse(line) } catch { throw invalid() }
    if (!value || typeof value !== 'object' || Array.isArray(value) || finalResult) throw invalid()
    const event = value as EventRecord
    if (event.type === 'error') {
      if (typeof event.code !== 'string' || !event.code || event.code.length > 120 || typeof event.message !== 'string' || event.message.length > 1800) throw invalid()
      throw options.error(event.code, event.message)
    }
    const language = contentLanguage(event.locale)
    if (!language || event.locale !== language.speechTag || language.speechTag !== options.locale) throw invalid()
    if (event.type === 'status') {
      if (typeof event.status !== 'string' || !event.status || event.status.length > 120) throw invalid()
    } else if (event.type === 'delta') {
      if (typeof event.text !== 'string' || !event.text || streamed.length + event.text.length > 1800) throw invalid()
      streamed += event.text
    } else if (event.type === 'done') {
      if (typeof event.message !== 'string' || !event.message.trim() || event.message.length > 1800 || event.caption !== event.message || (streamed && streamed !== event.message)) throw invalid()
      options.validateDone(event)
      finalResult = event as unknown as Result
    } else throw invalid()
    if (event.type !== 'done') options.onEvent?.(event as Event)
  }
  try {
    while (true) {
      if (options.signal.aborted) throw new DOMException('Presence request aborted.', 'AbortError')
      const { value, done } = await reader.read()
      if (done) break
      try { buffer += decoder.decode(value, { stream: true }) } catch { throw invalid() }
      if (buffer.length > 32_000) throw invalid()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) accept(line)
    }
    try { buffer += decoder.decode() } catch { throw invalid() }
    accept(buffer)
    if (options.signal.aborted) throw new DOMException('Presence request aborted.', 'AbortError')
    if (!finalResult) throw options.error(options.incompleteCode, 'Presence returned an incomplete response.')
    options.onEvent?.(finalResult as Event)
    return finalResult
  } finally {
    options.signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
