import assert from 'node:assert/strict'
import test from 'node:test'
import { OrbVoicePlayback } from '../src/spatial/orb/orbVoicePlayback.ts'
import { isOrbState, resolveOrbSensoryOutput } from '../src/app/home/orbStateController.ts'

const localVoice = { name: 'Local English', lang: 'en-US', localService: true }
const remoteVoice = { name: 'Remote English', lang: 'en-US', localService: false }

function fixture({ voices = [localVoice], language = 'en-US', requestExternalAudio = async () => new Blob(['voice']), playAudio } = {}) {
  const phases = []
  const notices = []
  const audios = []
  const revokedUrls = []
  const utterances = []
  const requests = []
  class Speech extends EventTarget {
    voices = voices
    cancelCount = 0
    getVoices() { return this.voices }
    speak(utterance) { utterances.push(utterance) }
    cancel() { this.cancelCount += 1 }
  }
  const speech = new Speech()
  const playback = new OrbVoicePlayback({
    onPhase: (phase) => phases.push(phase),
    onNotice: (notice) => notices.push(notice),
    requestExternalAudio: (text, signal) => {
      requests.push({ text, signal })
      return requestExternalAudio(text, signal)
    },
    voiceAvailabilityTimeoutMs: 0,
    environment: {
      speech,
      language,
      createUtterance: (text) => ({ text, onstart: null, onend: null, onerror: null }),
      createAudio: (url) => {
        const audio = {
          src: url, onplaying: null, onwaiting: null, onended: null, onerror: null,
          pauseCount: 0,
          pause() { this.pauseCount += 1 },
          play() { return playAudio ? playAudio(this) : Promise.resolve() },
        }
        audios.push(audio)
        return audio
      },
      createObjectURL: () => `blob:voice-${audios.length + 1}`,
      revokeObjectURL: (url) => revokedUrls.push(url),
    },
  })
  return { playback, phases, notices, audios, revokedUrls, utterances, requests, speech }
}

test('device speech stays queued until the native start event and stays speaking until its end', async () => {
  const f = fixture()
  await f.playback.play('A response longer than a decorative animation timer.', false)
  assert.equal(f.requests.length, 0)
  assert.equal(f.phases.at(-1), 'queued')
  assert.equal(f.phases.includes('speaking'), false)
  const utterance = f.utterances[0]
  assert.equal(utterance.voice, localVoice)
  utterance.onstart()
  assert.equal(f.phases.at(-1), 'speaking')
  utterance.onend()
  assert.equal(f.phases.at(-1), 'idle')
  assert.equal(f.notices.at(-1), 'finished')
})

test('external audio reports preparing until onplaying, buffering returns to preparing, and end releases the URL', async () => {
  const f = fixture()
  await f.playback.play('Natural reply', true)
  assert.equal(f.phases.at(-1), 'preparing')
  assert.equal(f.phases.includes('speaking'), false)
  const audio = f.audios[0]
  audio.onplaying()
  assert.equal(f.phases.at(-1), 'speaking')
  audio.onwaiting()
  assert.equal(f.phases.at(-1), 'preparing')
  audio.onplaying()
  assert.equal(f.phases.at(-1), 'speaking')
  audio.onended()
  assert.equal(f.phases.at(-1), 'idle')
  assert.deepEqual(f.revokedUrls, ['blob:voice-1'])
  assert.equal(audio.pauseCount, 1)
  assert.equal(audio.src, '')
})

test('stopping a pending external request prevents both late playback and device fallback', async () => {
  let finishRequest
  const f = fixture({ requestExternalAudio: () => new Promise((resolve) => { finishRequest = resolve }) })
  const pending = f.playback.play('Private reply', true)
  f.playback.stop()
  assert.equal(f.requests[0].signal.aborted, true)
  const phaseCount = f.phases.length
  finishRequest(new Blob(['late voice']))
  await pending
  assert.equal(f.audios.length, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.phases.length, phaseCount)
  assert.equal(f.phases.at(-1), 'idle')
})

test('replay invalidates retained callbacks from the previous utterance', async () => {
  const f = fixture()
  await f.playback.play('First reply', false)
  const first = f.utterances[0]
  const firstStart = first.onstart
  const firstEnd = first.onend
  await f.playback.play('Second reply', false)
  const second = f.utterances[1]
  second.onstart()
  const phaseCount = f.phases.length
  firstStart()
  firstEnd()
  assert.equal(f.phases.length, phaseCount)
  assert.equal(f.phases.at(-1), 'speaking')
  assert.equal(f.speech.cancelCount, 1)
  second.onend()
  assert.equal(f.phases.at(-1), 'idle')
})

test('external media failure transfers to one local fallback and ignores stale media callbacks', async () => {
  const f = fixture()
  await f.playback.play('Reply', true)
  const audio = f.audios[0]
  const stalePlaying = audio.onplaying
  const fail = audio.onerror
  fail()
  fail()
  await Promise.resolve()
  assert.equal(f.utterances.length, 1)
  const phaseCount = f.phases.length
  stalePlaying()
  assert.equal(f.phases.length, phaseCount)
  assert.deepEqual(f.revokedUrls, ['blob:voice-1'])
  f.utterances[0].onstart()
  assert.equal(f.phases.at(-1), 'speaking')
  f.playback.stop()
})

test('external request rejection is handled and uses only the explicit local device voice', async () => {
  const f = fixture({ requestExternalAudio: async () => { throw new Error('provider unavailable') } })
  await f.playback.play('Reply', true)
  assert.equal(f.utterances.length, 1)
  assert.equal(f.utterances[0].voice.localService, true)
  assert.equal(f.phases.at(-1), 'queued')
  assert.equal(f.notices.includes('external-unavailable'), true)
  f.playback.stop()
})

test('browser voices marked remote cannot be used as the local privacy fallback', async () => {
  const f = fixture({ voices: [remoteVoice] })
  await f.playback.play('Remain in readable text', false)
  assert.equal(f.requests.length, 0)
  assert.equal(f.utterances.length, 0)
  assert.equal(f.phases.includes('speaking'), false)
  assert.equal(f.phases.at(-1), 'idle')
  assert.equal(f.notices.at(-1), 'unavailable')
})

test('Orb uses the selected language and declines a foreign-only local voice', async () => {
  const frenchVoice = { name: 'Local French', lang: 'fr-FR', localService: true }
  const f = fixture({ voices: [localVoice, frenchVoice], language: 'fr-FR' })
  await f.playback.play('Réponse', false)
  assert.equal(f.utterances[0].voice, frenchVoice)
  assert.equal(f.utterances[0].lang, 'fr-FR')
  assert.equal(f.requests.length, 0)
  const unavailable = fixture({ voices: [localVoice], language: 'fr-FR' })
  await unavailable.playback.play('Réponse', false)
  assert.equal(unavailable.utterances.length, 0)
  assert.equal(unavailable.requests.length, 0)
  assert.equal(unavailable.notices.at(-1), 'unavailable')
})

test('native speech error ends speaking, and stopping after completion leaves unrelated speech alone', async () => {
  const f = fixture()
  await f.playback.play('Reply', false)
  const utterance = f.utterances[0]
  utterance.onstart()
  utterance.onerror()
  assert.equal(f.phases.at(-1), 'idle')
  assert.equal(f.notices.at(-1), 'unavailable')
  f.playback.stop()
  assert.equal(f.speech.cancelCount, 0)
})

test('stopping playing external audio aborts, pauses, detaches callbacks, and releases its URL once', async () => {
  const f = fixture()
  await f.playback.play('Reply', true)
  const audio = f.audios[0]
  audio.onplaying()
  const staleEnd = audio.onended
  f.playback.stop()
  const phaseCount = f.phases.length
  staleEnd()
  f.playback.stop()
  assert.equal(f.requests[0].signal.aborted, true)
  assert.equal(audio.pauseCount, 1)
  assert.equal(audio.onplaying, null)
  assert.equal(audio.onended, null)
  assert.deepEqual(f.revokedUrls, ['blob:voice-1'])
  assert.equal(f.phases.length, phaseCount + 1)
})

test('reduced motion and reduced stimulation retain semantic states while suppressing nonessential output', () => {
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) {
    const regular = resolveOrbSensoryOutput(state, false, false)
    const reduced = resolveOrbSensoryOutput(state, true, false)
    const calm = resolveOrbSensoryOutput(state, false, false, true)
    assert.equal(reduced.animation, 'orb-state-static')
    assert.equal(reduced.movement, 'settled')
    assert.equal(reduced.particles, 'none')
    assert.equal(calm.caption, regular.caption)
    assert.equal(calm.announcement, regular.announcement)
    assert.equal(calm.affordance, regular.affordance)
    assert.equal(calm.audioCue, null)
    assert.equal(calm.haptic, null)
    assert.equal(calm.particles, 'none')
    assert.ok(calm.light.intensity <= .66)
  }
})

test('untrusted Orb states reject prototype names and malformed event input without breaking the sensory fallback', () => {
  for (const invalid of ['toString', 'constructor', '__proto__', 'unknown', null, undefined, {}, 12]) {
    assert.equal(isOrbState(invalid), false)
    assert.equal(resolveOrbSensoryOutput(invalid, false, true).caption, 'Orb ready')
  }
  assert.equal(isOrbState('speaking'), true)
  assert.equal(isOrbState('privacy'), true)
})
