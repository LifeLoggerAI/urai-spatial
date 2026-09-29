type JsonMap = Record<string, unknown>

export const DIGITALOCEAN_INFERENCE_BASE_URL = 'https://inference.do-ai.run/v1'
export const DEFAULT_DIGITALOCEAN_MODEL = 'openai-gpt-oss-20b'
export const DIGITALOCEAN_CANARY_SENTINEL = 'URAI_DIGITALOCEAN_OK'

export class DigitalOceanProviderError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'DigitalOceanProviderError'
  }
}

export type DigitalOceanCanaryResult = {
  provider: 'digitalocean'
  model: string
  synthetic: true
  upstreamRequestId: string | null
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedInteger(value: unknown) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.trunc(number)
}

export async function runDigitalOceanSyntheticCanary(input: {
  apiKey: string
  signal?: AbortSignal
  model?: string
}): Promise<DigitalOceanCanaryResult> {
  if (!input.apiKey) throw new DigitalOceanProviderError(503, 'DIGITALOCEAN_NOT_CONFIGURED', 'DigitalOcean inference is not configured.')

  const model = String(input.model || DEFAULT_DIGITALOCEAN_MODEL).trim()
  if (!/^[A-Za-z0-9._/-]{1,160}$/.test(model)) {
    throw new DigitalOceanProviderError(500, 'DIGITALOCEAN_MODEL_INVALID', 'DigitalOcean inference model configuration is invalid.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  const forwardAbort = () => controller.abort()
  input.signal?.addEventListener('abort', forwardAbort, { once: true })

  let upstream: Response
  try {
    upstream = await fetch(DIGITALOCEAN_INFERENCE_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + input.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'This is a synthetic infrastructure canary. Reply with exactly ' + DIGITALOCEAN_CANARY_SENTINEL + ' and nothing else.',
          },
          {
            role: 'user',
            content: 'Run the UrAi synthetic provider health canary.',
          },
        ],
        temperature: 0,
        max_completion_tokens: 32,
        store: false,
      }),
      signal: controller.signal,
    })
  } catch {
    if (controller.signal.aborted) {
      throw new DigitalOceanProviderError(504, 'DIGITALOCEAN_TIMEOUT', 'DigitalOcean inference timed out.')
    }
    throw new DigitalOceanProviderError(503, 'DIGITALOCEAN_NETWORK_FAILURE', 'DigitalOcean inference is unreachable.')
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', forwardAbort)
  }

  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) {
      throw new DigitalOceanProviderError(503, 'DIGITALOCEAN_AUTH_FAILED', 'DigitalOcean inference authentication failed.')
    }
    if (upstream.status === 429) {
      throw new DigitalOceanProviderError(429, 'DIGITALOCEAN_RATE_LIMITED', 'DigitalOcean inference rate limit reached.')
    }
    throw new DigitalOceanProviderError(503, 'DIGITALOCEAN_REQUEST_FAILED', 'DigitalOcean inference request failed.')
  }

  let payload: unknown
  try {
    payload = await upstream.json()
  } catch {
    throw new DigitalOceanProviderError(502, 'DIGITALOCEAN_INVALID_RESPONSE', 'DigitalOcean inference returned invalid JSON.')
  }
  if (!isRecord(payload)) {
    throw new DigitalOceanProviderError(502, 'DIGITALOCEAN_INVALID_RESPONSE', 'DigitalOcean inference returned an invalid response.')
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : []
  const first = isRecord(choices[0]) ? choices[0] : {}
  const message = isRecord(first.message) ? first.message : {}
  const content = String(message.content ?? '').trim()
  if (content !== DIGITALOCEAN_CANARY_SENTINEL) {
    throw new DigitalOceanProviderError(502, 'DIGITALOCEAN_CANARY_MISMATCH', 'DigitalOcean inference did not return the expected synthetic canary.')
  }

  const usage = isRecord(payload.usage) ? payload.usage : {}
  return {
    provider: 'digitalocean',
    model: String(payload.model ?? model),
    synthetic: true,
    upstreamRequestId: upstream.headers.get('x-request-id') ?? upstream.headers.get('request-id'),
    usage: {
      inputTokens: boundedInteger(usage.prompt_tokens),
      outputTokens: boundedInteger(usage.completion_tokens),
      totalTokens: boundedInteger(usage.total_tokens),
    },
  }
}
