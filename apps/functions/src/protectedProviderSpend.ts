/** Configuration locates protected jobs; only the canonical gateway can reserve spend. */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { isIP } from 'node:net'
import { defineSecret } from 'firebase-functions/params'

export const SPATIAL_SPEND_WORKER_TOKENS_JSON = defineSecret('SPATIAL_SPEND_WORKER_TOKENS_JSON')
type JsonRecord = Record<string, unknown>
type BindingStore = { doc(path: string): { get(): Promise<{ exists: boolean; data(): unknown }> } }
export class SpatialSpendError extends Error {
  readonly status = 503
  readonly code = 'PROTECTED_SPEND_REQUIRED'
  constructor() { super('Protected provider spending is not available for this exact request.') }
}
function need(value: unknown): asserts value { if (!value) throw new SpatialSpendError() }
function record(value: unknown): JsonRecord { need(value !== null && typeof value === 'object' && !Array.isArray(value)); return value as JsonRecord }
function text(value: unknown): string { need(typeof value === 'string' && value.trim()); return value }
function sha(value: unknown, length = 64): string { need(typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value)); return value }
function instant(value: unknown) {
  need(typeof value === 'string')
  const parts = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.exec(value); need(parts)
  const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number), calendar = new Date(Date.UTC(year, month - 1, day))
  need(calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day && hour < 24 && minute < 60 && second < 60)
  const result = Date.parse(value); need(Number.isFinite(result)); return result
}
function fresh(value: JsonRecord, observed = 'observed_at', now = Date.now()) { need(instant(value[observed]) <= now && now < instant(value.expires_at)) }
export function spendDigest(value: string | Uint8Array) { return createHash('sha256').update(value).digest('hex') }
function stableJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') { need(Number.isFinite(value)); return JSON.stringify(value) }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  const object = record(value)
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`
}
function canonical(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
  if (value === null || typeof value === 'boolean') return String(value)
  if (typeof value === 'number') { need(Number.isSafeInteger(value)); return String(value) }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const object = record(value), keys = Object.keys(object).sort()
  need(keys.every(key => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)))
  return `{${keys.map(key => `${canonical(key)}:${canonical(object[key])}`).join(',')}}`
}
function jobDigest(job: JsonRecord) { return spendDigest(canonical(Object.fromEntries(Object.entries(job).filter(([key]) => key !== 'approval' && key !== 'attempts')))) }

const SOURCE_PATHS = ['providerFunctions.ts', 'adamPresenceFunctions.ts', 'personPresenceProvider.ts', 'personPresenceVoiceProvider.ts', 'councilProviderFunctions.ts', 'protectedProviderSpend.ts'].map(name => `apps/functions/src/${name}`)
/** Runtime declarations must agree with actual clean tracked enforcement source. */
export function spatialSpendSourceSha() {
  const expected = sha(process.env.URAI_SOURCE_SHA, 40)
  try {
    const options = { encoding:'utf8' as const, timeout:5000, stdio:['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'] }
    const root = execFileSync('git', ['-C', process.cwd(), 'rev-parse', '--show-toplevel'], options).trim()
    const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], options).trim()
    need(git('rev-parse', 'HEAD') === expected)
    const tracked = git('ls-files', '--error-unmatch', '--', ...SOURCE_PATHS).split('\n')
    need(tracked.length === SOURCE_PATHS.length && SOURCE_PATHS.every(path => tracked.includes(path)))
    need(!git('status', '--porcelain', '--untracked-files=all', '--', ...SOURCE_PATHS))
  } catch { throw new SpatialSpendError() }
  return expected
}
function endpoint(value: string, gateway = false) {
  let url: URL; try { url = new URL(value) } catch { throw new SpatialSpendError() }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  need(url.protocol === 'https:' && !url.username && !url.password && !url.hash && !isIP(host) && !host.startsWith('[') && host.includes('.') && !/(^|\.)(localhost|local|internal)$/.test(host))
  if (gateway) need(url.pathname === '/api/worker/production-spend' && !url.search)
  else need((url.origin === 'https://api.openai.com' && ['/v1/moderations', '/v1/responses'].includes(url.pathname)) || (url.origin === 'https://api.elevenlabs.io' && /^\/v1\/text-to-speech\/[A-Za-z0-9_-]{1,64}\/stream$/.test(url.pathname)) || (url.origin === 'https://api.anthropic.com' && url.pathname === '/v1/messages') || (url.origin === 'https://generativelanguage.googleapis.com' && /^\/v1beta\/models\/[A-Za-z0-9._%:-]+:generateContent$/.test(url.pathname)) || (['https://api.x.ai', 'https://api.mistral.ai'].includes(url.origin) && url.pathname === '/v1/chat/completions'))
  need(url.toString() === value)
  return value
}
async function boundedGatewayJson(response: Response) {
  need(response.ok)
  const reader = response.body?.getReader(); need(reader)
  const chunks: Uint8Array[] = []; let bytes = 0
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 65536) { await reader.cancel(); throw new SpatialSpendError() }; chunks.push(chunk.value) }
  } finally { reader.releaseLock() }
  let value: JsonRecord; try { value = record(JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'))) } catch { throw new SpatialSpendError() }
  need(value.ok === true); return value
}

/** Every external POST, including screening, enters this exact request boundary. */
export async function paidSpatialFetch(db: BindingStore, uid: string, lane: string, provider: string, model: string, sourceInput: unknown, target: string | URL, init: RequestInit): Promise<Response> {
  need(uid && lane && provider && model && init.method === 'POST' && typeof init.body === 'string')
  const url = endpoint(String(target)), configuredGatewayUrl = endpoint(text(process.env.SPATIAL_PRODUCTION_SPEND_URL), true)
  const sourceSha = spatialSpendSourceSha(), gatewaySha = sha(process.env.SPATIAL_SPEND_GATEWAY_SOURCE_SHA, 40)
  const bytes = Buffer.from(init.body, 'utf8'), headers = new Headers(init.headers), callerSignal = init.signal
  let actualBody: JsonRecord; try { actualBody = record(JSON.parse(init.body)) } catch { throw new SpatialSpendError() }
  const origins: Record<string, string> = { openai:'https://api.openai.com', elevenlabs:'https://api.elevenlabs.io', anthropic:'https://api.anthropic.com', gemini:'https://generativelanguage.googleapis.com', xai:'https://api.x.ai', mistral:'https://api.mistral.ai' }
  need(new URL(url).origin === origins[provider])
  need(provider === 'gemini' ? new URL(url).pathname === `/v1beta/models/${encodeURIComponent(model)}:generateContent` : (provider === 'elevenlabs' ? actualBody.model_id : actualBody.model) === model)
  const credentials = Object.fromEntries([...headers.entries()].filter(([key]) => ['authorization', 'xi-api-key', 'x-api-key', 'x-goog-api-key'].includes(key)))
  need(Object.keys(credentials).length > 0 && Object.values(credentials).every(value => Boolean(value.trim())) && (!credentials.authorization || /^Bearer\s+\S+$/.test(credentials.authorization)))
  const credentialSha = spendDigest(stableJson(credentials))
  const semanticSha = spendDigest(stableJson(Object.fromEntries([...headers.entries()].filter(([key]) => !Object.prototype.hasOwnProperty.call(credentials, key)))))
  const requestSha = spendDigest(Buffer.concat([Buffer.from(`POST\n${url}\n`, 'utf8'), bytes]))
  const inputSha = spendDigest(stableJson({ uid, lane, input:sourceInput })), tenantSha = spendDigest(uid)
  // This protected metadata merely locates the job. It cannot create an approval or a hold.
  const locator = spendDigest(stableJson({ tenant_sha256:tenantSha, lane, request_sha256:requestSha, source_input_sha256:inputSha }))
  const snapshot = await db.doc(`spatialPaidProviderBindings/${locator}`).get(); need(snapshot.exists)
  const binding = record(snapshot.data()), workerId = text(binding.worker_id), jobId = text(binding.job_id), accountId = text(binding.account_id)
  need(binding.tenant_sha256 === tenantSha && binding.lane === lane && binding.request_sha256 === requestSha && binding.source_input_sha256 === inputSha && binding.executor_source_sha === sourceSha && binding.credential_sha256 === credentialSha && binding.provider === provider)
  // Protected issuer metadata pins the destination before any token is read.
  const gatewayUrl = endpoint(text(binding.gateway_url), true)
  need(gatewayUrl === configuredGatewayUrl && binding.gateway_repository === 'LifeLoggerAI/asset-factory' && binding.gateway_source_sha === gatewaySha)
  const materialized = () => {
    need(spatialSpendSourceSha() === sourceSha && spendDigest(stableJson({ uid, lane, input:sourceInput })) === inputSha)
    need(spendDigest(Buffer.concat([Buffer.from(`POST\n${url}\n`, 'utf8'), bytes])) === requestSha)
    const currentCredentials = Object.fromEntries([...headers.entries()].filter(([key]) => ['authorization', 'xi-api-key', 'x-api-key', 'x-goog-api-key'].includes(key)))
    need(spendDigest(stableJson(currentCredentials)) === credentialSha)
    need(spendDigest(stableJson(Object.fromEntries([...headers.entries()].filter(([key]) => !Object.prototype.hasOwnProperty.call(currentCredentials, key))))) === semanticSha)
  }
  materialized(); need(!callerSignal?.aborted)
  let tokens: JsonRecord; try { tokens = record(JSON.parse(SPATIAL_SPEND_WORKER_TOKENS_JSON.value())) } catch { throw new SpatialSpendError() }
  const token = text(tokens[workerId]); need(token.length >= 32)
  const fields = {
    job_id:jobId, worker_id:workerId, executor_repository:'LifeLoggerAI/urai-spatial', executor_source_sha:sourceSha,
    gateway_repository:'LifeLoggerAI/asset-factory', gateway_source_sha:gatewaySha, consumer:'spatial-functions',
    tenant_sha256:tenantSha, provider, account_id:accountId, credential_sha256:credentialSha,
    source_input_sha256:inputSha, semantic_headers_sha256:semanticSha, content_type:text(headers.get('content-type')),
    request_sha256:requestSha, endpoint:url, model, asset:`spatial/${tenantSha}/${lane}`, request_size:String(bytes.byteLength),
  }
  const gateway = async (action: string, extra: JsonRecord = {}) => {
    // An uncertain reserve is never retried; the protected hold may already exist.
    materialized(); if (action !== 'record') need(!callerSignal?.aborted)
    try { return await boundedGatewayJson(await fetch(gatewayUrl, { method:'POST', redirect:'error', cache:'no-store', headers:{ authorization:`Bearer ${token}`, 'content-type':'application/json' }, body:JSON.stringify({ action, ...fields, ...extra }), signal:AbortSignal.timeout(15000) })) }
    catch { throw new SpatialSpendError() }
  }
  const prepared = await gateway('preflight')
  need(prepared.provider_call_authorized === false && prepared.execution_performed === false)
  const envelope = record(prepared.envelope), job = record(envelope.job), account = record(envelope.account), controls = record(envelope.protected_controls), price = record(envelope.protected_pricing), executor = record(job.executor), authority = record(job.authority), budget = record(job.budget), rates = record(budget.rates)
  need(job.job_id === jobId && job.provider === provider && job.account_id === accountId && job.model_version === model && job.consumer === fields.consumer && job.rights_reviewed === true)
  need(authority.repository === fields.executor_repository && authority.sha === sourceSha && executor.binding_version === 2)
  for (const [key, value] of Object.entries(fields)) {
    if (['job_id', 'provider', 'account_id', 'model', 'consumer', 'executor_repository', 'executor_source_sha'].includes(key)) continue
    need(executor[key] === value)
  }
  need(executor.repository === fields.executor_repository && executor.source_sha === sourceSha && Array.isArray(job.input_sha256) && job.input_sha256.includes(inputSha) && job.input_sha256.includes(requestSha))
  need(account.provider === provider && account.account_id === accountId && account.credential_sha256 === credentialSha && account.credential_binding_verified === true && Boolean(text(account.credential_binding_receipt)))
  need(account.trusted_readback === true); fresh(account)
  for (const key of ['credential_sha256', 'semantic_headers_sha256', 'source_input_sha256', 'content_type'] as const) need(controls[key] === fields[key] && price[key] === fields[key])
  need(controls.provider === provider && controls.account_id === accountId && controls.trusted_readback === true)
  need(controls.enforcement_source_sha === gatewaySha && controls.endpoint === url && controls.request_sha256 === requestSha && controls.hard_stop_supported === true && controls.cost_cap_enforced === true && controls.auto_top_up === false)
  for (const key of ['max_usd_micros', 'max_credits', 'max_runtime_seconds']) need(controls[key] === budget[key])
  text(controls.proof_receipt); fresh(controls)
  need(price.provider === provider && price.account_id === accountId && price.model_version === model && price.request_sha256 === requestSha && price.trusted_readback === true)
  text(price.receipt); fresh(price); need(canonical(price.rates) === canonical(rates)); text(rates.receipt); fresh(rates, 'verified_at')
  const digest = jobDigest(job), approval = record(job.approval), authorityProof = record(envelope.authority)
  need(approval.status === 'APPROVED' && approval.kind === 'EXPLICIT_BOUNDED_SPEND' && approval.job_digest === digest)
  need(approval.max_usd_micros === budget.max_usd_micros && approval.max_credits === budget.max_credits)
  text(approval.receipt); text(approval.approver); text(approval.key_id)
  need(/^[A-Za-z0-9+/]+={0,2}$/.test(text(approval.signature)))
  need(authorityProof.trusted_readback === true && canonical(authorityProof.binding) === canonical(authority))
  sha(executor.deployment_ref); sha(executor.controls_ref)
  const proofWindow = (now: number) => {
    fresh(approval, 'issued_at', now); fresh(authorityProof, 'observed_at', now)
    fresh(account, 'observed_at', now); fresh(controls, 'observed_at', now)
    fresh(price, 'observed_at', now); fresh(rates, 'verified_at', now)
    return Math.min(...[approval, authorityProof, account, controls, price, rates].map(value => instant(value.expires_at)))
  }
  const preflightExpiry = instant(prepared.admission_expires_at)
  materialized()
  let now = Date.now()
  // The canonical minimum also includes its independently verified deployment.
  need(now < preflightExpiry && preflightExpiry <= proofWindow(now))
  const reserveStartedAt = Date.now()
  need(reserveStartedAt < preflightExpiry && reserveStartedAt < proofWindow(reserveStartedAt))
  const admitted = await gateway('reserve', { job_digest:digest })
  const runtime = admitted.max_runtime_seconds
  need(admitted.provider_call_authorized === true && admitted.execution_performed === false && admitted.executor_source_sha === sourceSha && admitted.gateway_source_sha === gatewaySha && admitted.worker_id === workerId && admitted.job_digest === digest && typeof runtime === 'number' && Number.isSafeInteger(runtime) && runtime > 0 && runtime <= 86400)
  need(runtime === budget.max_runtime_seconds)
  for (const key of ['account_id', 'credential_sha256', 'semantic_headers_sha256', 'source_input_sha256', 'content_type'] as const) need(admitted[key] === fields[key])
  const reservedAt = instant(admitted.reserved_at), reserveExpiry = instant(admitted.admission_expires_at)
  now = Date.now()
  need(reserveStartedAt <= reservedAt && reservedAt <= now && reservedAt < reserveExpiry && now < reserveExpiry)
  need(reserveExpiry <= preflightExpiry && reserveExpiry <= reservedAt + runtime * 1000)
  // Network/admission delay consumes the original local runtime, never resets it.
  const deadline = Math.min(preflightExpiry, reserveExpiry, reserveStartedAt + runtime * 1000)
  const attemptId = text(admitted.attempt_id), controller = new AbortController()
  const signal = callerSignal ? AbortSignal.any([callerSignal, controller.signal]) : controller.signal
  const current = () => {
    materialized()
    const checkedAt = Date.now()
    need(!signal.aborted && checkedAt < deadline && checkedAt < proofWindow(checkedAt))
  }
  current()
  const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()))
  let observation: Promise<void> | undefined, requestId: string | undefined
  let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | undefined, outputController: ReadableStreamDefaultController<Uint8Array> | undefined
  const observe = (status: 'succeeded' | 'failed') => {
    if (observation) return observation
    // This only requests RECONCILIATION_REQUIRED. No runtime outcome settles money.
    observation = (async () => {
      const result = await gateway('record', { attempt_id:attemptId, status, ...(requestId ? { request_id:requestId } : {}) })
      need(result.provider_call_authorized === false && result.execution_performed === false && result.reconciliation_required === true)
    })()
    return observation
  }
  signal.addEventListener('abort', () => {
    outputController?.error(new SpatialSpendError())
    upstreamReader?.cancel(new SpatialSpendError()).catch(() => undefined)
    observe('failed').catch(() => undefined)
  }, { once:true })
  try {
    current()
    const upstream = await fetch(url, { ...init, method:'POST', body:bytes, headers, redirect:'error', signal })
    current()
    requestId = upstream.headers.get('request-id') ?? upstream.headers.get('x-request-id') ?? undefined
    if (!upstream.ok || !upstream.body) { await observe('failed'); current() }
    if (!upstream.body) { clearTimeout(timer); return new Response(null, { status:upstream.status, statusText:upstream.statusText, headers:upstream.headers }) }
    const reader = upstream.body.getReader()
    upstreamReader = reader
    const body = new ReadableStream<Uint8Array>({
      start(stream) { outputController = stream },
      async pull(stream) {
        try {
          current()
          const chunk = await reader.read()
          current()
          if (chunk.done) {
            await observe(upstream.ok ? 'succeeded' : 'failed')
            // A record acknowledgement does not renew authority or runtime.
            current()
            reader.releaseLock()
            clearTimeout(timer)
            stream.close()
          } else { current(); stream.enqueue(chunk.value) }
        } catch (error) {
          controller.abort()
          await observe('failed').catch(() => undefined)
          clearTimeout(timer)
          stream.error(error)
        }
      },
      async cancel(reason) {
        controller.abort()
        await reader.cancel(reason).catch(() => undefined)
        await observe('failed').catch(() => undefined)
        clearTimeout(timer)
      },
    })
    current()
    return new Response(body, { status:upstream.status, statusText:upstream.statusText, headers:upstream.headers })
  } catch (error) {
    controller.abort()
    await observe('failed').catch(() => undefined)
    clearTimeout(timer)
    throw error
  }
}
