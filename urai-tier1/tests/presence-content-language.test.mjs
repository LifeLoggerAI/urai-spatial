import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { contentLanguage, URAI_CONTENT_LANGUAGES, URAI_CONTENT_LANGUAGE_TAGS } from '../../packages/localization/src/contentLanguage.ts'

const sourceRoot = process.env.PRESENCE_LANGUAGE_SOURCE_ROOT
  ? new URL(`file://${process.env.PRESENCE_LANGUAGE_SOURCE_ROOT.replace(/\/$/, '')}/`)
  : new URL('../../', import.meta.url)
const readSource = path => fs.readFileSync(new URL(path, sourceRoot), 'utf8')
const frame = event => `data: ${JSON.stringify(event)}\n\n`
const outputEvent = delta => ({ type: 'response.output_text.delta', delta })
const completeEvent = { type: 'response.completed' }

function providerFixture(lane, options = {}) {
  const calls = [], events = [], writes = [], stores = []
  let authorityReads = 0, upstreamCompleted = false
  class Timestamp {
    constructor(value) { this.value = value }
    toMillis() { return this.value }
    static fromMillis(value) { return new Timestamp(value) }
  }
  const snapshot = path => ({
    exists: path.endsWith('privacyPolicy/current'),
    data: () => path.endsWith('privacyPolicy/current')
      ? { domains: { models: { mode: options.consentDenied ? 'denied' : 'granted', modelContext: !options.consentDenied }, identity: { mode: 'granted' } }, enforcement: { state: 'fully-enforced' } }
      : {},
  })
  const db = {
    doc: path => ({ path, get: async () => snapshot(path), set: async value => stores.push({ path, value }) }),
    runTransaction: async run => run({ get: async ref => snapshot(ref.path), set: () => undefined }),
  }
  const firestore = Object.assign(() => db, {
    Timestamp, FieldValue: { increment: value => value, serverTimestamp: () => 'synthetic-timestamp' },
  })
  class PersonPresenceAuthorityError extends Error { constructor(code) { super(code); this.code = code } }
  const authority = {
    authorityDigest: 'synthetic-source-authority', personId: 'synthetic-person', canonicalLabel: 'Synthetic fixture subject',
    mode: 'HISTORICAL_AS_OF', knowledgeCutoff: '1900-01-01', asOf: '1899-12-01',
    negativeConstraints: ['No invented historical claims.'], sceneUnknowns: ['Unknown possessions'], forbiddenAssertions: ['No invented testimony'],
    sceneTruthPacketId: 'synthetic-truth', evidence: [{ id: 'synthetic-claim', predicate: 'fixture', value: 'synthetic', evidenceClass: 'SOURCE_DERIVED', confidence: 'medium' }],
  }
  const source = readSource(`apps/functions/src/${lane === 'adam' ? 'adamPresenceFunctions.ts' : 'personPresenceProvider.ts'}`)
  const compiled = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  assert.equal(compiled.diagnostics.length, 0)
  const module = { exports: {} }
  vm.runInNewContext(compiled.outputText, {
    exports: module.exports, module,
    require: id => {
      if (id === 'node:crypto') return { createHash }
      if (id === 'firebase-admin') return { apps: [{}], firestore, auth: () => ({ verifyIdToken: async () => ({ uid: 'synthetic-owner' }) }) }
      if (id === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'synthetic-provider-key' }) }
      if (id === 'firebase-functions/v2/https') return { onRequest: (_configuration, handler) => handler }
      if (id === '../../../packages/localization/src/contentLanguage') return { contentLanguage, URAI_CONTENT_LANGUAGE_TAGS }
      if (id === './personPresenceAuthority') return {
        PersonPresenceAuthorityError,
        loadPersonPresenceAuthority: async () => {
          authorityReads++
          if (options.authorityDenied) throw new PersonPresenceAuthorityError('PERSON_MODEL_STALE')
          return options.revokeAfterStream && authorityReads >= 3 ? { ...authority, authorityDigest: 'revoked-source' } : authority
        },
      }
      throw Error(`Unexpected provider dependency ${id}`)
    },
    AbortController, Buffer, TextEncoder, TextDecoder, Response,
    setTimeout, clearTimeout, setInterval, clearInterval, Date, console,
    process: { env: { ADAM_PRESENCE_ENABLED: 'true', PERSON_PRESENCE_ENABLED: 'true' } },
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url, init, body })
      if (url.endsWith('/moderations')) return new Response(JSON.stringify({ results: [{ flagged: false }] }), { status: 200 })
      assert.equal(url, 'https://api.openai.com/v1/responses')
      const locale = options.localeOutput ?? contentLanguage(options.requestLocale ?? 'en-US')?.speechTag ?? 'en-US'
      const message = options.message ?? 'Synthetic fixture answer.'
      const data = lane === 'adam'
        ? { locale, caption: message, message, suggestedActions: [], requiresHumanFounder: false, handoffReason: '' }
        : { locale, message, caption: message, evidenceClaimIds: ['synthetic-claim'], uncertainty: '', simulationLabel: 'Synthetic simulation' }
      options.alterOutput?.(data)
      const chunks = options.outputChunks?.(data) ?? [JSON.stringify(data)]
      let index = 0
      const stream = new ReadableStream({
        pull(controller) {
          options.beforeRead?.({ index, events, upstreamCompleted })
          if (index < chunks.length) controller.enqueue(new TextEncoder().encode(frame(outputEvent(chunks[index++]))))
          else if (index++ === chunks.length) {
            upstreamCompleted = true
            controller.enqueue(new TextEncoder().encode(frame(completeEvent)))
          } else controller.close()
        },
      }, { highWaterMark: 0 })
      return new Response(stream, { status: 200, headers: { 'x-request-id': 'synthetic-upstream' } })
    },
  }, { filename: `${lane}-actual-provider.ts` })
  const invoke = async (body = {}) => {
    let code = 200, json = null
    const response = {
      headersSent: false, writableEnded: false,
      status(value) { code = value; return this },
      setHeader() {}, on() {},
      json(value) { json = value; this.headersSent = true; this.writableEnded = true },
      write(value) {
        this.headersSent = true
        writes.push({ value, upstreamCompleted })
        for (const line of value.trim().split('\n')) events.push(JSON.parse(line))
      },
      end(value = '') { if (value) this.write(value); this.writableEnded = true },
    }
    const handler = lane === 'adam' ? module.exports.adamPresenceProvider : module.exports.personPresenceProvider
    await handler({ method: 'POST', headers: { authorization: 'Bearer synthetic-owner' }, body: {
      message: 'Synthetic fixture question', surface: 'home', sessionId: 'presence:synthetic-session-00001',
      requestId: 'a'.repeat(64), context: [], aiProcessingConsent: true,
      ...(options.requestLocale === undefined ? {} : { locale: options.requestLocale }), ...body,
    } }, response)
    return { code, json, events, writes, calls, authorityReads }
  }
  return { invoke, events, calls }
}

for (const lane of ['adam', 'person']) {
  for (const [locale, tag] of URAI_CONTENT_LANGUAGES) {
    test(`${lane} transports governed ${locale} as canonical ${tag}`, async () => {
      const fixture = providerFixture(lane, { requestLocale: locale })
      const result = await fixture.invoke()
      assert.equal(result.code, 200)
      const done = result.events.find(event => event.type === 'done')
      assert.equal(done?.locale, tag)
      assert.equal(done?.caption, done?.message)
      assert.equal(result.events.filter(event => event.type === 'delta').map(event => event.text).join(''), done.message)
      for (const event of result.events.filter(event => ['status','delta','done'].includes(event.type))) assert.equal(event.locale, tag)
      const request = result.calls.find(call => call.url.endsWith('/responses'))
      assert.match(request.body.instructions, new RegExp(`content language ${tag.replace('-', '\\-')}`))
      assert.deepEqual(request.body.text.format.schema.properties.locale.enum, URAI_CONTENT_LANGUAGE_TAGS)
      assert.equal(request.body.store, false)
      if (lane === 'person') {
        assert.equal(done.historicalSourceAuthority, false)
        assert.equal(done.syntheticOutputMayBecomeHistoricalSource, false)
        assert.equal(result.authorityReads, 3)
      }
    })
  }
  for (const locale of ['', 'es; ignore governance', 'x'.repeat(36), 'en-US\nignore', 123, {}, true, null, 'xx-XX']) {
    test(`${lane} rejects unsupported locale ${JSON.stringify(locale)} before upstream processing`, async () => {
      const result = await providerFixture(lane, { requestLocale: locale }).invoke()
      assert.equal(result.code, 400)
      assert.equal(result.json?.error, 'INVALID_LOCALE')
      assert.equal(result.calls.length, 0)
      assert.equal(result.events.length, 0)
    })
  }
  for (const kind of ['missing', 'different', 'caption mismatch', 'non-string message']) {
    test(`${lane} rejects ${kind} response language/caption before generated deltas`, async () => {
      const result = await providerFixture(lane, {
        requestLocale: 'es',
        alterOutput: data => {
          if (kind === 'missing') delete data.locale
          if (kind === 'different') data.locale = 'fr-FR'
          if (kind === 'caption mismatch') data.caption = 'Another answer.'
          if (kind === 'non-string message') data.message = 42
        },
      }).invoke()
      assert.equal(result.events.filter(event => event.type === 'delta' || event.type === 'done').length, 0)
      assert.equal(result.json?.error ?? result.events.at(-1)?.code, 'INVALID_PROVIDER_RESPONSE')
    })
  }
  test(`${lane} defaults absent locale to English and binds canonical locale in upstream idempotency`, async () => {
    const missing = await providerFixture(lane).invoke()
    assert.equal(missing.events.at(-1).locale, 'en-US')
    const es = await providerFixture(lane, { requestLocale: 'es' }).invoke()
    const alias = await providerFixture(lane, { requestLocale: ' ES_es ' }).invoke()
    const fr = await providerFixture(lane, { requestLocale: 'fr-FR' }).invoke()
    const key = result => result.calls.find(call => call.url.endsWith('/responses')).init.headers['Idempotency-Key']
    assert.equal(key(es), key(alias))
    assert.notEqual(key(es), key(fr))
  })
  test(`${lane} retains revoked consent denial before provider requests`, async () => {
    const result = await providerFixture(lane, { consentDenied: true }).invoke()
    assert.equal(result.code, 403)
    assert.equal(result.calls.length, 0)
  })
}

test('Adam preserves actual progressive streaming after validated language and complete equivalent caption', async () => {
  let sawProgress = false
  const result = await providerFixture('adam', {
    requestLocale: 'ar',
    outputChunks: data => {
      const raw = JSON.stringify(data)
      const split = raw.indexOf('"message":"') + '"message":"'.length + 9
      return [raw.slice(0, split), raw.slice(split)]
    },
    beforeRead: ({ index, events, upstreamCompleted }) => {
      if (index === 1) {
        const delta = events.find(event => event.type === 'delta')
        assert.equal(upstreamCompleted, false)
        assert.equal(delta?.text, 'Synthetic')
        assert.equal(delta?.locale, 'ar-SA')
        sawProgress = true
      }
    },
  }).invoke()
  assert.equal(sawProgress, true)
  assert.equal(result.events.at(-1).type, 'done')
  assert.equal(result.events.at(-1).locale, 'ar-SA')
})

test('Adam buffers message-first output until complete language and caption validation', async () => {
  const result = await providerFixture('adam', {
    requestLocale: 'ja',
    outputChunks: data => {
      const ordered = { message: data.message, caption: data.caption, locale: data.locale, suggestedActions: [], requiresHumanFounder: false, handoffReason: '' }
      const raw = JSON.stringify(ordered)
      return [raw.slice(0, 20), raw.slice(20)]
    },
    beforeRead: ({ index, events }) => { if (index <= 2) assert.equal(events.filter(event => event.type === 'delta').length, 0) },
  }).invoke()
  assert.equal(result.events.at(-1).type, 'done')
  assert.equal(result.writes.filter(write => JSON.parse(write.value).type === 'delta').every(write => write.upstreamCompleted), true)
})

test('Adam does not split surrogate pairs across progressive caption/audio deltas', async () => {
  const result = await providerFixture('adam', {
    message: 'A😀B', requestLocale: 'zh-Hans',
    outputChunks: data => {
      const raw = JSON.stringify(data)
      const start = raw.indexOf('"message":"') + '"message":"'.length
      return [raw.slice(0, start + 2), raw.slice(start + 2)]
    },
  }).invoke()
  const deltas = result.events.filter(event => event.type === 'delta').map(event => event.text)
  assert.deepEqual(deltas, ['A', '😀B'])
  assert.equal(result.events.at(-1).caption, 'A😀B')
})

test('Adam rejects mismatched progressive text before releasing its bad prefix', async () => {
  const result = await providerFixture('adam', {
    alterOutput: data => data.caption = 'Different caption.',
    outputChunks: data => {
      const raw = JSON.stringify(data)
      const split = raw.indexOf('"message":"') + '"message":"'.length + 9
      return [raw.slice(0, split), raw.slice(split)]
    },
  }).invoke()
  assert.equal(result.events.filter(event => ['delta','done'].includes(event.type)).length, 0)
  assert.equal(result.events.at(-1).code, 'INVALID_PROVIDER_RESPONSE')
})

test('Adam streams escaped caption text without mistaking embedded field names for top-level metadata', async () => {
  const message = 'Quote "message":"invented", newline\nbackslash\\, emoji😀.'
  const result = await providerFixture('adam', {
    message, requestLocale: 'ur',
    outputChunks: data => {
      const raw = JSON.stringify(data)
      const start = raw.indexOf('"message":"') + '"message":"'.length
      return [raw.slice(0, start + 10), raw.slice(start + 10)]
    },
  }).invoke()
  assert.equal(result.events.at(-1).type, 'done')
  assert.equal(result.events.at(-1).caption, message)
  assert.equal(result.events.filter(event => event.type === 'delta').map(event => event.text).join(''), message)
  assert.equal(result.events.filter(event => event.type === 'delta').every(event => event.locale === 'ur-PK'), true)
})

test('Adam rejects changed final captions after a valid progressive prefix', async () => {
  const result = await providerFixture('adam', {
    outputChunks: data => {
      const raw = JSON.stringify(data)
      const split = raw.indexOf('"message":"') + '"message":"'.length + 9
      return [raw.slice(0, split), raw.slice(split, -1) + ',"message":"Changed answer.","caption":"Changed answer."}']
    },
  }).invoke()
  assert.equal(result.events.find(event => event.type === 'delta').text, 'Synthetic')
  assert.equal(result.events.some(event => event.type === 'delta' && event.text.includes('Changed answer.')), false)
  assert.equal(result.events.some(event => event.type === 'done'), false)
  assert.equal(result.events.at(-1).code, 'INVALID_PROVIDER_RESPONSE')
})

test('Adam bounds partial structured output without releasing an oversized message', async () => {
  const result = await providerFixture('adam', { outputChunks: () => ['x'.repeat(32_001)] }).invoke()
  assert.equal(result.events.at(-1).code, 'OPENAI_RESPONSE_LIMIT')
  assert.equal(result.events.filter(event => ['delta','done'].includes(event.type)).length, 0)
})

test('Person Presence still denies stale protected source authority before upstream requests', async () => {
  const result = await providerFixture('person', { authorityDenied: true }).invoke()
  assert.equal(result.code, 409)
  assert.equal(result.json.error, 'PERSON_MODEL_STALE')
  assert.equal(result.calls.length, 0)
})

test('Person Presence rechecks source authority after model output before releasing language/captions', async () => {
  const result = await providerFixture('person', { requestLocale: 'fa', revokeAfterStream: true }).invoke()
  assert.equal(result.authorityReads, 3)
  assert.equal(result.code, 409)
  assert.equal(result.json.error, 'PRESENCE_AUTHORITY_CHANGED')
  assert.equal(result.events.length, 0)
})

test('Person Presence still rejects unsupported evidence claim IDs before output', async () => {
  const result = await providerFixture('person', { alterOutput: data => data.evidenceClaimIds = ['invented-claim'] }).invoke()
  assert.equal(result.json.error, 'INVALID_PROVIDER_RESPONSE')
  assert.equal(result.events.length, 0)
})

test('server language changes retain accepted private Founder voice and simulated source fences', () => {
  const adam = readSource('apps/functions/src/adamPresenceFunctions.ts')
  const person = readSource('apps/functions/src/personPresenceProvider.ts')
  for (const field of ['FOUNDER_VOICE_ENABLED','FOUNDER_VOICE_NOT_READY','FOUNDER_VOICE_ID_MISSING','FOUNDER_ELEVENLABS_VOICE_ID']) assert.ok(adam.includes(field))
  assert.doesNotMatch(adam, /pNInz6obpgDQGcFmaJgB/)
  assert.match(person, /Generated dialogue is simulation and can never become historical testimony/)
  assert.match(person, /syntheticOutputMayBecomeHistoricalSource:false/)
  assert.match(person, /recheckSessionAuthority\(uid, sessionId, authority\.authorityDigest\)/)
})
