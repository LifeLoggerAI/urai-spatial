import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const authorityPath = new URL('../urai-tier1/src/app/currentHomeVisualAuthority.json', import.meta.url)
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))
const supportedAuthoritySchemas = new Set(['urai-home-visual-authority-1', 'urai-home-visual-authority-2'])
if (!supportedAuthoritySchemas.has(authority.schemaVersion)) throw new Error(`Home visual authority schema is unsupported: ${authority.schemaVersion}`)
if (!authority.rendererOwner || !authority.artRevision || !authority.worldIdentifier || !authority.proofSchema) {
  throw new Error('Home visual authority is missing a required identity field')
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4 || !authority.runtimeAssets.includes(authority.rendererOwner)) {
  throw new Error('Home visual authority runtime asset inventory is incomplete')
}
if (authority.artRevision !== 'v288-cinematic-lived-world-grounded-reliquary') {
  throw new Error(`Home state proof expected V288 authority; received ${authority.artRevision}`)
}

const capturePath = new URL('./capture-home-state-proof.mjs', import.meta.url)
const generatedPath = new URL('./.capture-home-state-proof-v288.generated.mjs', import.meta.url)
const original = await readFile(capturePath, 'utf8')
const stalePredicate = "record.movement === 'walk-keyboard-click-touch'"
const currentPredicate = "record.movement === 'camera-look-world-surface-selection'"
const currentPredicateCount = original.split(currentPredicate).length - 1
if (currentPredicateCount !== 1 || original.includes(stalePredicate)) {
  throw new Error('Home state proof movement predicate is not bound exactly once to the current first-person authority')
}

// Headless Chromium exposes Web Speech API objects but does not start an OS speech
// engine, so SpeechSynthesisUtterance.onstart never fires. Runtime authority correctly
// refuses to publish acoustic `speaking` until that onstart edge exists. Install a
// generated-proof-only transport object instead of mutating runtime source. Replacing the
// window property is more deterministic than assigning inherited SpeechSynthesis methods,
// which Chromium may keep native/read-only even when a plain assignment appears to work.
const speechFixtureAnchor = 'window.__uraiObservedOrbStates = []'
const speechFixtureCount = original.split(speechFixtureAnchor).length - 1
if (speechFixtureCount !== 1) throw new Error('Home state proof device-speech fixture anchor is not unique')
const speechFixture = `${speechFixtureAnchor}\n      window.__uraiProofSpeechTransport = 'deterministic-ci-device-speech-window-override-v2'\n      if ('speechSynthesis' in window) {\n        const nativeSynth = window.speechSynthesis\n        let proofSpeaking = false\n        const proofSynth = Object.create(nativeSynth ?? null)\n        Object.defineProperties(proofSynth, {\n          speaking: { configurable: true, enumerable: true, get: () => proofSpeaking },\n          pending: { configurable: true, enumerable: true, get: () => false },\n          paused: { configurable: true, enumerable: true, get: () => false },\n          cancel: { configurable: true, enumerable: true, writable: true, value: () => { proofSpeaking = false } },\n          pause: { configurable: true, enumerable: true, writable: true, value: () => {} },\n          resume: { configurable: true, enumerable: true, writable: true, value: () => {} },\n          getVoices: { configurable: true, enumerable: true, writable: true, value: () => nativeSynth?.getVoices?.() ?? [] },\n          speak: {\n            configurable: true, enumerable: true, writable: true,\n            value: (utterance) => {\n              proofSpeaking = true\n              window.queueMicrotask(() => utterance.onstart?.(new Event('start')))\n              window.setTimeout(() => utterance.onboundary?.({ charIndex: Math.min(8, utterance.text?.length ?? 0) }), 120)\n              window.setTimeout(() => { proofSpeaking = false; utterance.onend?.(new Event('end')) }, 4200)\n            },\n          },\n        })\n        try {\n          Object.defineProperty(window, 'speechSynthesis', { configurable: true, enumerable: true, value: proofSynth })\n        } catch {\n          try { Object.defineProperty(nativeSynth, 'cancel', { configurable: true, value: proofSynth.cancel }) } catch {}\n          try { Object.defineProperty(nativeSynth, 'speak', { configurable: true, value: proofSynth.speak }) } catch {}\n          try { Object.defineProperty(nativeSynth, 'speaking', { configurable: true, get: () => proofSpeaking }) } catch {}\n        }\n      }`

const lifecycleRecordAnchor = "const record = { id, pageErrors, passed: false, reducedMotion }"
const lifecycleRecordCount = original.split(lifecycleRecordAnchor).length - 1
if (lifecycleRecordCount !== 1) throw new Error('Home state proof Orb lifecycle receipt anchor is not unique')
const lifecycleRecordWithFixture = "const record = { id, pageErrors, passed: false, reducedMotion, speechTransportFixture: 'deterministic-ci-device-speech-window-override-v2', audibleQualityCertified: false }"

let derived = original
  .replace(speechFixtureAnchor, speechFixture)
  .replace(lifecycleRecordAnchor, lifecycleRecordWithFixture)

// Playwright locator.focus() can wait on actionability/stability for a control that is
// already present and natively focusable while the live 3D Home continues rendering.
// The keyboard proof must still prove actual focus and native key activation; it must not
// click, force, or bypass accessibility. For generated proof only, focus the concrete DOM
// element, assert document.activeElement, then dispatch the same keyboard key through the
// page keyboard. This keeps the requirement strict while removing the unrelated 30 s
// actionability stall observed on the semantic Orb control.
const keyboardProofReplacements = [
  {
    source: 'await openOrb.focus()', expected: 1,
    replacement: "if (!await openOrb.evaluate((element) => { if (!(element instanceof HTMLElement)) return false; element.focus({ preventScroll: true }); return document.activeElement === element })) throw new Error('Orb open control failed DOM keyboard-focus verification')",
  },
  { source: "await openOrb.press('Enter')", expected: 1, replacement: "await page.keyboard.press('Enter')" },
  {
    source: 'await talk.focus()', expected: 1,
    replacement: "if (!await talk.evaluate((element) => { if (!(element instanceof HTMLElement)) return false; element.focus({ preventScroll: true }); return document.activeElement === element })) throw new Error('Orb conversation summary failed DOM keyboard-focus verification')",
  },
  { source: "await talk.press('Enter')", expected: 1, replacement: "await page.keyboard.press('Enter')" },
  {
    source: 'await message.focus()', expected: 2,
    replacement: "if (!await message.evaluate((element) => { if (!(element instanceof HTMLElement)) return false; element.focus({ preventScroll: true }); return document.activeElement === element })) throw new Error('Orb message field failed DOM keyboard-focus verification')",
  },
  {
    source: 'await consent.focus()', expected: 2,
    replacement: "if (!await consent.evaluate((element) => { if (!(element instanceof HTMLElement)) return false; element.focus({ preventScroll: true }); return document.activeElement === element })) throw new Error('Orb consent control failed DOM keyboard-focus verification')",
  },
  { source: "await consent.press('Space')", expected: 2, replacement: "await page.keyboard.press('Space')" },
  {
    source: 'await send.focus()', expected: 1,
    replacement: "if (!await send.evaluate((element) => { if (!(element instanceof HTMLElement)) return false; element.focus({ preventScroll: true }); return document.activeElement === element })) throw new Error('Orb send control failed DOM keyboard-focus verification')",
  },
  { source: "send.press('Enter')", expected: 1, replacement: "page.keyboard.press('Enter')" },
]
for (const replacement of keyboardProofReplacements) {
  const count = derived.split(replacement.source).length - 1
  if (count !== replacement.expected) throw new Error(`Home state proof keyboard anchor mismatch for ${replacement.source}: expected ${replacement.expected}, received ${count}`)
  derived = derived.replaceAll(replacement.source, replacement.replacement)
}

await writeFile(generatedPath, derived, 'utf8')
let result
try {
  result = spawnSync(process.execPath, ['scripts/.capture-home-state-proof-v288.generated.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  })
} finally {
  await rm(generatedPath, { force: true }).catch(() => {})
}

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.status !== 0) {
  const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
  await mkdir(outputDir, { recursive: true })
  let failingRecord = null
  try {
    const receipt = JSON.parse(await readFile(path.join(outputDir, 'receipt.json'), 'utf8'))
    failingRecord = receipt.errors?.[0] ?? null
  } catch {}
  await writeFile(path.join(outputDir, 'runner-failure.json'), `${JSON.stringify({
    schemaVersion: 'urai-home-state-runner-failure-2',
    exactHead: process.env.URAI_EXACT_HEAD || 'local',
    authority,
    derivedProof: {
      source: 'capture-home-state-proof.mjs',
      replacement: 'deterministic CI-only device speech transport replaces the headless window speechSynthesis transport and supplies onstart/boundary/onend; runtime state/rendering remains authoritative; generated proof uses direct DOM focus plus activeElement assertion before native keyboard activation and keeps the CI-only device-speech window long enough for constrained software-WebGL rendering',
      reason: 'headless Chromium exposes Web Speech but does not start an OS speech engine, and live WebGL rendering can keep locator.focus actionability unstable even when the semantic control is present and natively focusable; proof must not force runtime to fake acoustic speaking or bypass keyboard focus',
      audibleQualityCertified: false,
    },
    exitStatus: result.status,
    signal: result.signal,
    failedPredicate: failingRecord?.error || failingRecord?.id || 'capture-process-failed-before-receipt',
    failingRecord,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }, null, 2)}\n`)
  process.exitCode = result.status ?? 1
}
