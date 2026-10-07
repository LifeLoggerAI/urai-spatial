import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { contentLanguage } from '../src/lib/i18n/contentLanguage.ts'

const localVoice = { name: 'Local English', lang: 'en-US', localService: true }
const remoteVoice = { name: 'Remote English', lang: 'en-US', localService: false }

function fixture({ voices = [localVoice], language = 'en-US', request = async () => new Blob(['narration']), playAudio, fallback = 'speech' } = {}) {
  let now = 100000
  let timerId = 0
  let urlId = 0
  const timers = new Map()
  const requests = []
  const audios = []
  const revoked = []
  const utterances = []
  const captions = []
  const errors = []
  class Speech extends EventTarget {
    voices = voices
    cancellations = 0
    getVoices() { return this.voices }
    speak(utterance) { utterances.push(utterance) }
    cancel() { this.cancellations += 1 }
  }
  class Utterance { constructor(text) { this.text = text } }
  class Media {
    onended = null
    onerror = null
    pauseCount = 0
    currentTime = 0
    constructor(src) { this.src = src; audios.push(this) }
    pause() { this.pauseCount += 1 }
    play() { return playAudio ? playAudio(this) : Promise.resolve() }
  }
  const speech = new Speech()
  const source = fs.readFileSync(path.resolve('src/spatial/narrator/narratorPlayback.ts'), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    exports: module.exports,
    module,
    require: (id) => {
      if (id === '../../lib/i18n/contentLanguage') return { contentLanguage }
      assert.equal(id, './elevenlabsClient')
      return { requestNarratorAudio: (line, signal, consent) => { requests.push({ line, signal, consent }); return request(line, signal, consent) } }
    },
    AbortController, Blob, Audio: Media, SpeechSynthesisUtterance: Utterance,
    process: { env: { NEXT_PUBLIC_URAI_NARRATOR_FALLBACK: fallback } },
    window: { speechSynthesis: speech },
    navigator: { language: 'en-US' },
    Date: { now: () => now },
    Math: { floor: Math.floor, random: () => 0 },
    URL: { createObjectURL: () => `blob:narrator-${++urlId}`, revokeObjectURL: (url) => revoked.push(url) },
    console: { info() {} },
    setTimeout: (callback, milliseconds) => { const id = ++timerId; timers.set(id, { callback, due: now + milliseconds }); return id },
    clearTimeout: (id) => timers.delete(id),
  }, { filename: 'narratorPlayback.ts' })
  const playback = module.exports.narratorPlayback
  playback.subscribe((line, visible) => captions.push({ id: line?.id ?? null, visible }))
  const advance = (milliseconds) => {
    now += milliseconds
    for (let count = 0; count < 50; count += 1) {
      const due = [...timers.entries()].filter(([, timer]) => timer.due <= now).sort((a, b) => a[1].due - b[1].due)[0]
      if (!due) return
      timers.delete(due[0])
      const result = due[1].callback()
      result?.catch((error) => errors.push(error))
    }
    throw new Error('narrator timer loop did not settle')
  }
  const settle = async () => { for (let index = 0; index < 16; index += 1) await Promise.resolve(); assert.deepEqual(errors, []) }
  const line = (id, options = {}) => ({ id, moment: 'home_idle', text: `Private line ${id}`, tone: 'calm', priority: 100, delayMs: 0, durationMs: 10000, voiceId: 'permitted-test-voice', interruptible: true, ...options })
  return { playback, requests, audios, revoked, utterances, captions, speech, line, advance, settle }
}

test('stopping a pending external request prevents null-response native fallback', async () => {
  let resolve
  const f = fixture({ request: () => new Promise((finish) => { resolve = finish }) })
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('pending'))
  f.advance(0)
  f.playback.stopLine()
  const captions = f.captions.length
  assert.equal(f.requests[0].signal.aborted, true)
  resolve(null)
  await f.settle()
  assert.equal(f.audios.length, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.captions.length, captions)
})

test('consent withdrawal and regrant cannot admit a late external blob from the cancelled line', async () => {
  let resolve
  const f = fixture({ request: () => new Promise((finish) => { resolve = finish }) })
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('pending'))
  f.advance(0)
  f.playback.setExternalVoiceConsent(false)
  f.playback.setExternalVoiceConsent(true)
  resolve(new Blob(['late audio']))
  await f.settle()
  assert.equal(f.requests[0].signal.aborted, true)
  assert.equal(f.audios.length, 0)
  assert.equal(f.utterances.length, 0)
})

test('withdrawal stops playing external audio, releases its URL once and ignores its retained callbacks', async () => {
  const f = fixture()
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('first'))
  f.advance(0)
  await f.settle()
  const audio = f.audios[0]
  const staleEnd = audio.onended
  const staleError = audio.onerror
  f.playback.setExternalVoiceConsent(false)
  assert.equal(audio.pauseCount, 1)
  assert.equal(audio.src, '')
  assert.equal(audio.onended, null)
  assert.equal(audio.onerror, null)
  assert.deepEqual(f.revoked, ['blob:narrator-1'])
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('second'))
  f.advance(0)
  await f.settle()
  const captions = f.captions.length
  staleEnd()
  staleError()
  await f.settle()
  assert.equal(f.captions.length, captions)
  assert.equal(f.audios[1].pauseCount, 0)
  assert.equal(f.utterances.length, 0)
  assert.deepEqual(f.revoked, ['blob:narrator-1'])
})

test('a rejected play promise after stop cannot start fallback speech', async () => {
  let reject
  const f = fixture({ playAudio: () => new Promise((_, fail) => { reject = fail }) })
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('play-pending'))
  f.advance(0)
  await f.settle()
  f.playback.stopLine()
  reject(new Error('late play rejection'))
  await f.settle()
  assert.equal(f.utterances.length, 0)
  assert.deepEqual(f.revoked, ['blob:narrator-1'])
})

test('native fallback admits an explicit local voice, and stop cancels speech only while the narrator owns an utterance', async () => {
  const f = fixture({ voices: [remoteVoice, localVoice] })
  await f.playback.playLine(f.line('local'))
  f.advance(0)
  await f.settle()
  assert.equal(f.requests.length, 0)
  assert.equal(f.utterances.length, 1)
  const utterance = f.utterances[0]
  const staleEnd = utterance.onend
  assert.equal(utterance.voice, localVoice)
  f.playback.stopLine()
  const captions = f.captions.length
  staleEnd()
  assert.equal(f.captions.length, captions)
  assert.equal(utterance.onend, null)
  assert.equal(f.speech.cancellations, 1)
  f.playback.stopLine()
  assert.equal(f.speech.cancellations, 1)
})

test('stopping during native voice discovery prevents later voiceschanged playback', async () => {
  const f = fixture({ voices: [] })
  await f.playback.playLine(f.line('discovering'))
  f.advance(0)
  await f.settle()
  f.playback.stopLine()
  f.speech.voices = [localVoice]
  f.speech.dispatchEvent(new Event('voiceschanged'))
  await f.settle()
  assert.equal(f.utterances.length, 0)
  assert.equal(f.requests.length, 0)
  assert.equal(f.speech.cancellations, 0)
})

test('remote-only browser voices cannot be used as a local privacy fallback', async () => {
  const f = fixture({ voices: [remoteVoice] })
  await f.playback.playLine(f.line('remote-only'))
  f.advance(0)
  await f.settle()
  f.advance(1500)
  await f.settle()
  assert.equal(f.requests.length, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.captions.at(-1).visible, false)
})

test('native narrator uses declared content language and leaves foreign-only voices silent', async () => {
  const frenchVoice = { name: 'Local French', lang: 'fr-FR', localService: true }
  const f = fixture({ voices: [localVoice, frenchVoice], language: 'fr-FR' })
  await f.playback.playLine(f.line('selected-language', {locale:'fr-FR'}))
  f.advance(0)
  await f.settle()
  assert.equal(f.utterances[0].voice, frenchVoice)
  assert.equal(f.utterances[0].lang, 'fr-FR')
  assert.equal(f.requests.length, 0)
  const unavailable = fixture({ voices: [localVoice], language: 'fr-FR' })
  await unavailable.playback.playLine(unavailable.line('foreign-only', {locale:'fr-FR'}))
  unavailable.advance(0)
  await unavailable.settle()
  unavailable.advance(1500)
  await unavailable.settle()
  assert.equal(unavailable.utterances.length, 0)
  assert.equal(unavailable.requests.length, 0)
})

test('a French interface preference does not relabel or voice authored English narration', async () => {
  const frenchVoice = { name:'Local French', lang:'fr-FR', localService:true }
  const f = fixture({ voices:[localVoice, frenchVoice], language:'fr-FR' })
  await f.playback.playLine(f.line('english-source'))
  f.advance(0); await f.settle()
  assert.equal(f.utterances[0].voice, localVoice)
  assert.equal(f.utterances[0].lang, 'en-US')
})

test('an unsupported declared content language remains readable without voice submission', async () => {
  const f = fixture()
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('unsupported', {locale:'xx-ZZ'}))
  f.advance(0); await f.settle()
  assert.equal(f.requests.length, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.captions.at(-1).visible, true)
})

test('authored narrator language is captured before delayed external fallback', async () => {
  const frenchVoice = { name: 'Local French', lang: 'fr-FR', localService: true }
  let finishRequest
  const f = fixture({ voices: [localVoice, frenchVoice], request: () => new Promise(resolve => { finishRequest = resolve }) })
  f.playback.setExternalVoiceConsent(true)
  const line = f.line('captured-french', { text: 'Texte français.', locale: 'fr-FR' })
  await f.playback.playLine(line)
  f.advance(0)
  line.locale = 'en-US'
  finishRequest(null)
  await f.settle()
  assert.equal(f.utterances[0].voice, frenchVoice)
})

test('later external consent cannot promote a line admitted for local playback', async () => {
  const f = fixture()
  await f.playback.playLine(f.line('local-admission', { delayMs: 10 }))
  f.playback.setExternalVoiceConsent(true)
  f.advance(10)
  await f.settle()
  assert.equal(f.requests.length, 0)
  assert.equal(f.utterances.length, 1)
  f.playback.setExternalVoiceConsent(false)
  assert.equal(f.speech.cancellations, 0)
  assert.equal(f.utterances[0].onend !== null, true)
})

test('media error followed by play rejection transfers to one local fallback', async () => {
  let reject
  const f = fixture({ playAudio: () => new Promise((_, fail) => { reject = fail }) })
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('media-error'))
  f.advance(0)
  await f.settle()
  const fail = f.audios[0].onerror
  fail()
  fail()
  reject(new Error('same media error'))
  await f.settle()
  assert.equal(f.utterances.length, 1)
  assert.equal(f.utterances[0].voice, localVoice)
  assert.deepEqual(f.revoked, ['blob:narrator-1'])
})

test('replacement line retains ownership when an older request finishes later', async () => {
  const resolves = new Map()
  const f = fixture({ request: (line) => new Promise((finish) => resolves.set(line.id, finish)) })
  f.playback.setExternalVoiceConsent(true)
  await f.playback.playLine(f.line('first'))
  f.advance(0)
  await f.playback.playLine(f.line('second'))
  f.advance(0)
  resolves.get('second')(new Blob(['new line']))
  await f.settle()
  const captions = f.captions.length
  resolves.get('first')(null)
  await f.settle()
  assert.equal(f.audios.length, 1)
  assert.equal(f.audios[0].pauseCount, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.captions.length, captions)
})

test('native speech obeys duration cutoff and silent mode does not enqueue a browser voice', async () => {
  const f = fixture()
  await f.playback.playLine(f.line('bounded-local', { durationMs: 400 }))
  f.advance(0)
  await f.settle()
  assert.equal(f.utterances.length, 1)
  f.advance(400)
  assert.equal(f.speech.cancellations, 1)
  const silent = fixture({ fallback: 'silent' })
  await silent.playback.playLine(silent.line('silent'))
  silent.advance(0)
  await silent.settle()
  assert.equal(silent.requests.length, 0)
  assert.equal(silent.utterances.length, 0)
})
