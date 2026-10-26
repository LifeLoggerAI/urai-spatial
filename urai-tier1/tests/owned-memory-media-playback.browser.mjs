import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild'))
const { chromium } = require('playwright')
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(repo, 'artifacts/owned-memory-playback-browser')
mkdirSync(output, { recursive: true })
const fixture = JSON.parse(readFileSync(path.join(repo, 'urai-tier1/tests/fixtures/owned-memory-playback-synthetic.json'), 'utf8'))
const bytes = Buffer.from(fixture.bytes, 'base64')
assert.equal(fixture.synthetic, true)
assert.equal(fixture.privateFamilyUsed, false)
assert.equal(bytes.length, fixture.byteLength)
assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256)

// A separate synthetic PCM source exercises the production audio/wav allowlist.
// MP4 video bytes labeled audio/mp4 are not an admitted owned-memory format.
const audioBytes = Buffer.alloc(44 + 8_000 * 3 * 2)
audioBytes.write('RIFF', 0); audioBytes.writeUInt32LE(audioBytes.length - 8, 4); audioBytes.write('WAVEfmt ', 8)
audioBytes.writeUInt32LE(16, 16); audioBytes.writeUInt16LE(1, 20); audioBytes.writeUInt16LE(1, 22)
audioBytes.writeUInt32LE(8_000, 24); audioBytes.writeUInt32LE(16_000, 28)
audioBytes.writeUInt16LE(2, 32); audioBytes.writeUInt16LE(16, 34); audioBytes.write('data', 36)
audioBytes.writeUInt32LE(audioBytes.length - 44, 40)
for (let sample = 0; sample < 24_000; sample++) audioBytes.writeInt16LE(Math.round(512 * Math.sin(sample * 2 * Math.PI * 220 / 8_000)), 44 + sample * 2)
const audioFixture = { ...fixture, bytes: audioBytes.toString('base64'), byteLength: audioBytes.length,
  sha256: createHash('sha256').update(audioBytes).digest('hex') }

// Only Firebase SDK and unrelated world/assistant boundaries are fixtures.
// The consumers, receipt parser, transport, Blob ownership and decoded clock
// below are the actual repository sources, not reimplementations.
const shims = {
  // Two distinct SDK sessions, never a fabricated shared-UID shortcut. Both
  // remain synthetic browser boundary fixtures, not real Firebase IAM evidence.
  'firebase/app': `export const getApps=()=>window.__fixture.studioApp?[window.__fixture.studioApp]:[];export const initializeApp=(options,name)=>{const app={name,options};window.__fixture.studioApp=app;return app};export const getApp=()=>window.__fixture.studioApp;`,
  'firebase/auth': `export const getAuth=app=>app?.name==='urai-studio-private-replay'?window.__fixture.studioAuth:window.__fixture.auth;export const onAuthStateChanged=(auth,callback)=>{const observers=auth===window.__fixture.studioAuth?window.__fixture.studioObservers:window.__fixture.authObservers;observers.add(callback);queueMicrotask(()=>callback(auth.currentUser));return()=>observers.delete(callback)};`,
  'firebase/firestore': `export { Timestamp } from '@firebase/firestore';const snap=(p)=>{const v=window.__fixture.docs[p];return {id:p.split('/').at(-1),exists:()=>v!=null,data:()=>v==null?undefined:structuredClone(v),get:(k)=>k.split('.').reduce((x,key)=>x?.[key],v)}};export const doc=(db,...p)=>p.join('/');export const collection=(db,...p)=>p.join('/');export const limit=()=>null;export const query=(p)=>p;export const getDoc=async p=>snap(p);export const getDocs=async p=>({docs:Object.keys(window.__fixture.docs).filter(k=>k.startsWith(p+'/')&&k.slice(p.length+1).indexOf('/')<0).map(snap)});export const onSnapshot=(p,callback,error)=>{const w={p,callback,error};window.__fixture.watchers.add(w);window.__fixture.allWatchers.push(w);if(!window.__fixture.holdSnapshots.includes(p))queueMicrotask(()=>callback(snap(p)));return()=>window.__fixture.watchers.delete(w)};export const __snapshot=snap;`,
  'firebase/functions': `export const httpsCallable=(functions,name)=>async data=>({data:await window.__fixture.call(name,data)});`,
  '@/lib/firebase/client': `export const app={options:{projectId:'urai-4dc1d'}};export const firebasePublicEnvReady=true;export const functions={};export const getFirebaseDb=()=>({});export const getUraiAuth=()=>window.__fixture.auth;`,
  // Synthetic transport test: Canvas never mounts, but compiling the REAL
  // Replay consumer requires the real @react-three/fiber hook export surface.
  // This is not a rendering or GPU readiness proof; the independent browser
  // world workflow runs the actual R3F package and verifies pixels.
  '@react-three/fiber': `export function Canvas(){return null};export function useFrame(){};export function useThree(select){const state={invalidate:()=>{}};return typeof select==='function'?select(state):state}`, 
  // Rendering assets are explicitly unavailable to this synthetic private-media transport.
  // An accidental world mount must fail closed rather than masquerade as an admitted GLTF.
  '@react-three/drei': `export const useGLTF=Object.assign(()=>{throw Error('Synthetic private-memory transport must not load world art')},{preload:()=>{},clear:()=>{}});`,

  '@/spatial/assets/uraiAssets': `export const replayAssets={primary:{src:'/disclosed-unused-demo.png'}};`,
  '@/spatial/adam/AdamLauncherSlot': `export default function AdamLauncherSlot(){return null}`, 
  '@/spatial/life-model/useReplayLifeModelAuthority': `export const useReplayLifeModelAuthority=()=>({available:false,status:'unavailable',people:[]});`,
  '@/spatial/interpretive-world/useInterpretiveWorldReplayEntry': `export const useInterpretiveWorldReplayEntry=()=>null;`,
  '@/spatial/performance/useAdaptiveSpatialQuality': `export const useAdaptiveSpatialQuality=()=>({shadows:false,pixelRatioMax:1,documentVisible:true,reducedMotion:true,antialias:false});`,
  '@/spatial/world/WorldStateProvider': `export const useUraiWorldState=()=>({world:{previousDestination:'focus'}});`,
  '@/spatial/world/worldEvents': `export const requestUraiWorldTravel=value=>{window.__fixture.worldTravel=value};export const requestUraiWorldReturn=()=>{window.__fixture.worldReturnRequests=(window.__fixture.worldReturnRequests??0)+1};`,
  '@/lib/i18n/JourneyOfflineNotice': `export default function JourneyOfflineNotice(){return null}`, 
  './ReplayProductControls': `export function ReplayProductControls(){return null}`, 
  './ReplayPersonPresence': `export function ReplayPersonPresence(){return null}`, 
  'next/navigation': `export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:(href)=>{window.__fixture.navigation=href}});`,
  '@/spatial/captured-reality/CapturedRealityPrivateScene': `import {useEffect} from 'react';export default function Scene({decision}){useEffect(()=>{if(decision.mode!=='gaussian-splat')return;window.__fixture.sceneMounts++;return()=>{window.__fixture.sceneDisposals++}},[decision.mode]);return <div data-scene-fixture={decision.mode} style={{minHeight:'100svh'}}>Synthetic scene-disposal boundary — no reconstructed geometry</div>}`,
}
const buildOptions = {
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{localizedMessage,ENGLISH_LOCALE_PREFERENCE}from'./src/lib/i18n/localePreference';window.__fixtureLocaleText=(id,values)=>localizedMessage(ENGLISH_LOCALE_PREFERENCE,id,values).text;import{isConsentPolicy}from'./src/app/privacy-controls/consentModel';window.__fixtureIsConsentPolicy=isConsentPolicy;import Replay from './src/app/replay/CinematicReplayClient';import Movie from './src/app/life-movie/LifeMovieClient';import Place from './src/app/spatial/captured-reality/CapturedRealityRouteClient';const Component=location.pathname==='/life-movie'?Movie:location.pathname==='/spatial/captured-reality'?Place:Replay;const root=createRoot(document.getElementById('root'));root.render(<Component/>);window.__unmount=()=>root.unmount();`, resolveDir: path.join(repo, 'urai-tier1'), loader: 'tsx' },
  bundle: true, write: false, metafile: true, format: 'iife', platform: 'browser', jsx: 'automatic',
  // Next normally substitutes public env reads at build time. The original
  // private-Life-Movie adapter was added after this standalone esbuild harness;
  // bind its disabled-by-default flag explicitly without inventing window.process.
  define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': '"urai-4dc1d"', 'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': '"urai-4dc1d.firebasestorage.app"',
    'process.env.NEXT_PUBLIC_URAI_SPATIAL_PRIVATE_MOVIE_ENABLED': '"false"' },
  plugins: [{ name: 'sdk-only-fixtures', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, args => {
      if (Object.hasOwn(shims, args.path)) return { path: args.path, namespace: 'fixture' }
      if (args.path.startsWith('@/')) {
        const base = path.join(repo, 'urai-tier1/src', args.path.slice(2))
        const found = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find(existsSync)
        if (!found) throw new Error(`Unresolved actual source ${args.path}`)
        return { path: found }
      }
    })
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: shims[args.path], loader: 'tsx', resolveDir: path.join(repo, 'urai-tier1') }))
  } }],
}
const compiled = await build(buildOptions)
// The existing private bundle remains the independent synthetic-browser regression.
const privateDefines = {...buildOptions.define,
  'process.env.NEXT_PUBLIC_URAI_SPATIAL_PRIVATE_MOVIE_ENABLED':'"true"',
  'process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_API_KEY':'"synthetic-public-key"',
  'process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_AUTH_DOMAIN':'"studio-replay.invalid"',
  'process.env.NEXT_PUBLIC_URAI_STUDIO_FIREBASE_PROJECT_ID':'"urai-studio"',
  'process.env.NEXT_PUBLIC_URAI_SPATIAL_SEGMENTED_MOVIE_ENABLED':'"false"',
  'process.env.NEXT_PUBLIC_URAI_STUDIO_PRIVATE_MEDIA_ORIGIN':'"https://studio-replay.invalid"'
}
const privateCompiled = await build({...buildOptions,define:privateDefines})
// Separate, explicit, nonproduction integration: original Replay source and
// real HTTP requests to the actual exported Studio route, NEVER Playwright
// fulfillment of the protected media request.
const realStudioOrigin = process.env.URAI_STUDIO_REAL_HANDLER_ORIGIN || null
if (realStudioOrigin) {
  assert.equal(process.env.NODE_ENV,'development')
  assert.equal(process.env.URAI_STUDIO_PROTECTED_BROWSER_LOOPBACK,'true')
  const url = new URL(realStudioOrigin)
  assert.equal(url.origin,realStudioOrigin)
  assert.equal(url.protocol,'http:')
  assert.equal(url.hostname,'127.0.0.1')
  assert.ok(process.env.URAI_JOBS_SYNTH_MP4 && process.env.URAI_JOBS_SYNTH_SRT)
  assert.equal(createHash('sha256').update(readFileSync(process.env.URAI_JOBS_SYNTH_MP4)).digest('hex'),
    'c4ba548d480d7c71fb8e9efa496f1282bb833cdbb5303c868aa2a5e685c6fe91')
}
// The real server remains nonproduction development. The original Replay
// deliberately permits HTTP only for local origins in development mode.
// The React development bundle also needs a minimal lexical "process" shim
// to satisfy a demonstrated bare reference (Wave 156 browser diagnostic).
// This shim exists ONLY inside the explicit localhost Chromium test bundle;
// it exports no process object or privileged credentials to window.
const segmentedCompiled = realStudioOrigin ? await build({...buildOptions,
  define:{...privateDefines,'process.env.NODE_ENV':'"development"',
    'process.env.NEXT_PUBLIC_URAI_SPATIAL_SEGMENTED_MOVIE_ENABLED':'"true"',
    'process.env.NEXT_PUBLIC_URAI_STUDIO_PRIVATE_MEDIA_ORIGIN':JSON.stringify(realStudioOrigin)},
  banner:{js:'(()=>{const process=Object.freeze({env:Object.freeze({NODE_ENV:"development"})});'},
  footer:{js:'})();'}
}) : null
const segmentedBundle=segmentedCompiled?.outputFiles[0].text??null
const integratedCompiled = realStudioOrigin ? await build({...buildOptions,
  define:{
    ...privateDefines,
    'process.env.NODE_ENV':'"development"',
    'process.env.NEXT_PUBLIC_URAI_STUDIO_PRIVATE_MEDIA_ORIGIN':JSON.stringify(realStudioOrigin)
  },
  banner:{js:'(()=>{const process=Object.freeze({env:Object.freeze({NODE_ENV:"development"})});'},
  footer:{js:'})();'}
}) : null
assert.ok(Object.keys(compiled.metafile.inputs).some(file => file.replaceAll('\\','/').endsWith('/lib/i18n/useUraiLocale.ts')),'Actual locale hook must be compiled, not a raw-key fixture')
assert.ok(Object.keys(compiled.metafile.inputs).some(file => file.replaceAll('\\','/').endsWith('/app/replay/useProtectedLifeMovieReplay.ts')),
  'Compile actual optional protected Replay adapter; do not bypass its source')

const bundle = compiled.outputFiles[0].text
const privateBundle = privateCompiled.outputFiles[0].text
const integratedBundle = integratedCompiled?.outputFiles[0].text ?? null
if(integratedCompiled) {
  assert.equal(buildOptions.define['process.env.NODE_ENV'],'"test"',
    'Standard browser regressions must retain proven test-mode React')
  assert.ok(integratedBundle.startsWith('(()=>{const process=Object.freeze(') &&
    integratedBundle.trimEnd().endsWith('})();'),
    'Only integrated local Chromium bundle receives scoped development process shim')
  assert.ok(Object.keys(integratedCompiled.metafile.inputs).some(file =>
    file.replaceAll('\\','/').endsWith('/app/replay/useProtectedLifeMovieReplay.ts')),
    'Actual-server Chromium bundle must include original protected Replay source')
}
assert.ok(Object.keys(privateCompiled.metafile.inputs).some(file =>
  file.replaceAll('\\','/').endsWith('/app/replay/useProtectedLifeMovieReplay.ts')),
  'Dual-identity browser test must compile the real private Replay hook')
const server = createServer((request, response) => {
  if (request.url === '/fixture-segmented.js' && segmentedBundle) { response.setHeader('Content-Type','text/javascript'); response.end(segmentedBundle); return }
  if (request.url === '/fixture-integrated.js' && integratedBundle) { response.setHeader('Content-Type','text/javascript'); response.end(integratedBundle); return }
  if (request.url === '/fixture.js' || request.url === '/fixture-private.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(request.url === '/fixture-private.js' ? privateBundle : bundle); return }
  const script = request.url?.includes('segmentMode=1') && segmentedBundle ? '/fixture-segmented.js' : request.url?.includes('realHandler=1') && integratedBundle ? '/fixture-integrated.js' : request.url?.includes('dualPrivate=1') ? '/fixture-private.js' : '/fixture.js'
  response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="' + script + '"></script>')
})
await new Promise(resolve => server.listen(realStudioOrigin ? 4173 : 0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
if(realStudioOrigin)assert.equal(origin,'http://127.0.0.1:4173','Studio must explicitly approve actual Chromium origin')
const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true, args: ['--no-sandbox'] })
const cases = [], errors = []
const memoryId = 'synthetic-receipt-memory', receiptId = 'a'.repeat(64), ownerId = 'synthetic-owner'
const privatePlanId = 'lmp_' + 'a'.repeat(24), privatePlaylistDigest = 'c'.repeat(64)
const privateCaptions = Buffer.from('1\n00:00:00,000 --> 00:00:02,000\nFictional matched protected memory caption\n')

async function open(route = '/replay', settings = {}) {
  const mediaFixture = settings.audio ? audioFixture : fixture
  const mediaBytes = settings.audio ? audioBytes : bytes
  const context = await browser.newContext({ viewport: settings.viewport ?? (settings.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }), isMobile: !!settings.mobile, hasTouch: !!settings.mobile })
  const page = await context.newPage()
  const privateRequests = []
  const realResponses = []
  if (settings.realHandler) {
    assert.ok(realStudioOrigin,'missing real protected server readiness')
    page.on('request',request=>{
      if(request.url()!==realStudioOrigin+'/api/studio/spatial-private-media' ||
          request.method()!=='POST')return
      const payload=JSON.parse(request.postData() ?? '{}')
      privateRequests.push({kind:payload.kind,action:payload.action,segmentIndex:payload.segmentIndex??null,method:request.method()})
    })
    page.on('response',response=>{
      if(response.url()!==realStudioOrigin+'/api/studio/spatial-private-media')return
      realResponses.push({method:response.request().method(),status:response.status(),
        kind:response.request().method()==='POST'?
          JSON.parse(response.request().postData()??'{}').kind:null,
        action:response.request().method()==='POST'?JSON.parse(response.request().postData()??'{}').action:null,
        segmentIndex:response.request().method()==='POST'?JSON.parse(response.request().postData()??'{}').segmentIndex??null:null,
        contentType:response.headers()['content-type'],
        contentLength:response.headers()['content-length'],
        playlistDigest:response.headers()['x-urai-private-playlist-digest'],
        cors:response.headers()['access-control-allow-origin']})
    })
  }
  const bootstrapDiagnostics = []
  page.on('pageerror', error => {
    errors.push(error.stack || error.message)
    if (settings.realHandler) bootstrapDiagnostics.push({
      event: 'pageerror', detail: String(error.stack || error.message).slice(0, 1200)
    })
  })
  if (settings.realHandler) {
    // Do not print bearer headers, request bodies or protected response bytes.
    page.on('console', message => {
      if (message.type() === 'error') bootstrapDiagnostics.push({
        event: 'console-error', detail: message.text().slice(0, 700)
      })
    })
    page.on('requestfailed', request => bootstrapDiagnostics.push({
      event: 'request-failed', method: request.method(),
      pathname: new URL(request.url()).pathname,
      reason: request.failure()?.errorText?.slice(0, 250)
    }))
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin)
        bootstrapDiagnostics.push({
          event: 'local-script-response', status: response.status(),
          pathname: new URL(response.url()).pathname
        })
    })
  }
  await page.addInitScript(({ fixture, memoryId, receiptId, ownerId, settings }) => {
    const memory = { ownerId, title: settings.title ?? 'Synthetic receipt source — not family media', occurredAt: '2026-01-01T12:00:00.000Z', summary: 'A synthetic control fixture.', emotionalState: 'calm', privacy: 'private', consentState: 'authorized', sourceMedia: [{ kind: settings.audio ? 'audio' : 'video', mediaReceiptId: receiptId }], star: { position: [0, 0, -4] }, replayManifest: { id: 'synthetic-manifest', version: 1, durationMs: 3000, segments: ['memory', 'emotion', 'pattern', 'return'].map((id, i) => ({ id, label: id, caption: `Synthetic ${id}`, narratorLine: settings.narration ?? 'Synthetic narration caption only', startsAtMs: i * 750, durationMs: 750 })) } }
    const kind = settings.audio ? 'audio' : 'video', mime = settings.audio ? 'audio/wav' : 'video/mp4'
    const receipt = { schemaVersion: 'urai-owned-memory-media-v1', ownerUid: ownerId, memoryId, receiptId, kind, state: 'ready', sha256: fixture.sha256, byteLength: fixture.byteLength, contentType: mime, storageGeneration: '123', consentRevision: 1, consentReceiptHash: 'b'.repeat(64), consentExpiresAt: Date.now() + 600000, deletionGeneration: 0, attemptNonce: 'synthetic-private-nonce', bucketName: 'synthetic-opaque-bucket', objectPath: 'synthetic-private-object' }
    // Match the strict canonical policy. An older two-domain shortcut is now
    // intentionally rejected by the real selected-memory authorization hook.
    const domain = () => ({ mode: 'limited', retentionDays: 365, precise: false, replayVisible: true,
      lifeMapVisible: true, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false })
    const policy = { ownerId, version: 2, revision: 1,
      domains: { memory: { ...domain(), mode: 'granted', modelContext: true }, location: domain(),
        models: { ...domain(), modelContext: true }, exports: { ...domain(), mode: 'denied' },
        workforce: { ...domain(), mode: 'paused' }, identity: domain() },
      enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } }
    const base = `users/${ownerId}`
    // Genuine Studio account-link parsing requires a JWT-shaped Spatial token.
    // Only the explicitly isolated real-handler test uses synthetic JWT-shaped
    // fixtures. The server still verifies them through its test-only provider.
    const fixtureSpatialToken = 'a'.repeat(45)+'.'+'b'.repeat(45)+'.'+'c'.repeat(45)
    const foreignSpatialToken = 'd'.repeat(45)+'.'+'e'.repeat(45)+'.'+'f'.repeat(45)
    const auth = { currentUser: { uid: ownerId, getIdToken: async () => settings.realHandler
      ? settings.realHandlerForeignSpatial ? foreignSpatialToken : fixtureSpatialToken
      : 'synthetic-sdk-token' } }
    const studioAuth = { currentUser: {uid:settings.privateWrongStudio?'synthetic-studio-user-b':'synthetic-studio-user-a',
      getIdToken:async()=>settings.privateWrongStudio?'synthetic-studio-token-b':'synthetic-studio-token-a'} }
    const f = window.__fixture = { auth, authObservers: new Set(), studioAuth, studioObservers:new Set(), watchers: new Set(), allWatchers: [], holdSnapshots: settings.hold ? [`${base}/memoryMediaReceipts/${receiptId}`] : [], docs: { ['consentRecords/'+ownerId+'_memory_storage']: { uid: ownerId, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: receipt.consentReceiptHash, expiresAt: receipt.consentExpiresAt }, [base]: { accountStatus: 'active' }, [`${base}/memories/${memoryId}`]: memory, [`${base}/privacyPolicy/current`]: policy, [`${base}/privacyRuntime/exportAuthority`]: { generation: 0, pendingDeletions: {} }, [`${base}/memoryMediaReceipts/${receiptId}`]: receipt, [`${base}/privacyRuntime/location-collection`]: { enabled: true }, [`${base}/capturedRealityReplayBindings/${memoryId}`]: { ownerId, memoryId, state: 'accepted', capturedRealityAssetId: 'synthetic-accepted-place' }, [`${base}/capturedRealityAssets/synthetic-accepted-place`]: { ownerId, state: 'ready', reviewState: 'accepted', releaseState: 'private-pilot' }, [`${base}/lifeMovies/synthetic-movie`]: { id: 'synthetic-movie', version: 1, ownerId, status: 'ready', consentState: 'authorized', chapters: [{ id: 'synthetic-chapter', memoryId, order: 0, truthClass: 'RECORDED_SOURCE_TRUTH', confidence: 1, consentState: 'authorized', provenance: { sourceIds: ['synthetic-source'], objectIds: [], storyNodeIds: [], providerTaskIds: [] } }] } }, calls: [], creates: [], revocations: [], heldMedia: [], sceneMounts: 0, sceneDisposals: 0, denyAuthority: false, tamper: !!settings.tamper }
    const snapshot = p => { const value = f.docs[p]; return { exists: () => value != null, data: () => value == null ? undefined : structuredClone(value), get: k => k.split('.').reduce((v, key) => v?.[key], value) } }
    f.update = (p, value) => { f.docs[p] = value; for (const w of [...f.watchers]) if (w.p === p) w.callback(snapshot(p)) }
    // Revocation must itself retain a valid schema and advance its revision:
    // a malformed policy-denial test is not proof of live privacy enforcement.
    f.setReplayVisible = visible => {
      const p = `${base}/privacyPolicy/current`, before = f.docs[p]
      const next = { ...before, revision: before.revision + 1,
        domains: { ...before.domains, memory: { ...before.domains.memory, replayVisible: visible } } }
      if (!window.__fixtureIsConsentPolicy(next, ownerId)) throw Error('SYNTHETIC_CANONICAL_POLICY_INVALID')
      f.update(p, next)
    }
    f.emitAuth = user => { auth.currentUser = user; for (const callback of [...f.authObservers]) callback(user) }
    f.emitStudioAuth = user => { studioAuth.currentUser = user; for (const callback of [...f.studioObservers]) callback(user) }
    f.call = async (name, data) => {
      f.calls.push({ name, data })
      if (f.deferName === name) await new Promise(resolve => { f.releaseDeferred = resolve })
      if (f.denyAuthority) throw new Error('synthetic current authority denied')
      if (name === 'getMemoryMediaPlaybackAuthority') return { schemaVersion: 'urai-owned-memory-media-playback-v1', requiresAuthorization: true, ownerId, memoryId, receiptId, kind, contentType: mime, sha256: fixture.sha256, byteLength: fixture.byteLength, storageGeneration: '123', sourceAuthorityHash: 'c'.repeat(64), authorityHash: 'd'.repeat(64), expiresAt: Date.now() + (settings.expiry ? 1400 : 60000) }
      if (name === 'getCapturedRealityReplayEntry') return { available: true, assetId: 'synthetic-accepted-place', truthLabel: 'Synthetic SDK-boundary place entry; no world acceptance' }
      if (name === 'getCapturedRealityAsset') return { assetId: data.assetId, label: 'Synthetic SDK place', truthClass: 'spatially-reconstructable', truthLabel: 'Synthetic fixture only', sourceCount: 1 }
      // Isolated media-transport fixtures do not contain reviewed private GLB
      // geometry. Preserve the product's explicit disabled-mesh-only fallback.
      // Any other mesh error remains fatal and cannot show the private world.
      if (name === 'getCapturedRealityMeshUrl') throw new Error('CAPTURED_REALITY_MESH_DISABLED')
      if (name === 'getCapturedRealityRuntimeUrl') return { assetId: data.assetId, accessMode: data.accessMode, deviceTier: data.deviceTier, url: `https://us-central1-urai-4dc1d.cloudfunctions.net/streamCapturedRealityRuntime?assetId=${data.assetId}&accessMode=${data.accessMode}&deviceTier=${data.deviceTier}&deliveryId=${'e'.repeat(64)}`, expiresAt: new Date(Date.now()+60000).toISOString(), truthLabel: 'Synthetic fixture only', requiresAuthorization: true, runtimeSha256: 'f'.repeat(64), runtimeByteLength: 32, storageGeneration: '321' }
      throw new Error(`Unimplemented SDK boundary ${name}`)
    }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { const url = create(blob); f.creates.push({ url, type: blob.type, size: blob.size }); return url }
    URL.revokeObjectURL = url => { f.revocations.push({ url, media: f.heldMedia.filter(element => element.dataset.ownedFixtureUrl === url).map(element => ({ paused: element.paused, src: element.getAttribute('src') })) }); revoke(url) }
    const src = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')
    Object.defineProperty(HTMLMediaElement.prototype, 'src', { ...src, set(value) { if (String(value).startsWith('blob:')) { this.dataset.ownedFixtureUrl = value; f.heldMedia.push(this) } src.set.call(this, value) } })
  }, { fixture: mediaFixture, memoryId, receiptId, ownerId, settings })
  await page.route('https://us-central1-urai-4dc1d.cloudfunctions.net/**', async intercepted => {
    const request = intercepted.request(), url = new URL(request.url())
    if (request.method() === 'OPTIONS') { await intercepted.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization', 'Access-Control-Allow-Methods': 'GET' } }); return }
    // This unrelated SDK request must carry the SAME Spatial identity chosen
    // for this browser scenario, including the deliberately foreign identity.
    // Studio's actual exported handler must still independently deny that
    // foreign token; never substitute the owner's token to make the test pass.
    const expectedSDKToken = settings.realHandler
      ? settings.realHandlerForeignSpatial
        ? 'd'.repeat(45)+'.'+'e'.repeat(45)+'.'+'f'.repeat(45)
        : 'a'.repeat(45)+'.'+'b'.repeat(45)+'.'+'c'.repeat(45)
      : 'synthetic-sdk-token'
    assert.equal(request.headers().authorization,'Bearer '+expectedSDKToken,
      'unrelated SDK transport must preserve the selected fictional Spatial identity')
    const tamper = await page.evaluate(() => window.__fixture.tamper)
    const body = url.pathname === '/streamCapturedRealityRuntime' ? Buffer.alloc(32) : tamper ? Buffer.alloc(mediaBytes.length) : mediaBytes
    await intercepted.fulfill({ status: 200, body, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'Content-Length,X-URAI-Checksum-SHA256,X-URAI-Storage-Generation', 'Content-Type': url.pathname === '/streamCapturedRealityRuntime' ? 'application/octet-stream' : settings.audio ? 'audio/wav' : 'video/mp4', 'Content-Length': String(body.length), 'X-URAI-Checksum-SHA256': url.pathname === '/streamCapturedRealityRuntime' ? 'f'.repeat(64) : mediaFixture.sha256, 'X-URAI-Storage-Generation': url.pathname === '/streamCapturedRealityRuntime' ? '321' : '123' } })
  })
  if (settings.dualPrivate && !settings.realHandler) await page.route('https://studio-replay.invalid/**', async intercepted => {
    const request=intercepted.request(), headers=request.headers()
    const cors={ 'Access-Control-Allow-Origin':origin,
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'authorization, content-type, x-urai-spatial-id-token',
      'Access-Control-Expose-Headers':'content-type, content-length, x-urai-private-playlist-digest',
      'Cache-Control':'private, no-store, max-age=0' }
    if (request.method()==='OPTIONS') { await intercepted.fulfill({status:204,headers:cors});return }
    assert.equal(request.method(),'POST','private media never uses public GET')
    const body=JSON.parse(request.postData()??'{}')
    assert.deepEqual(body,{action:'deliver-spatial-final',memoryId,movieId:'synthetic-movie',
      planId:privatePlanId,kind:body.kind},'actual original Replay selectors must match')
    assert.ok(body.kind==='mp4'||body.kind==='srt')
    privateRequests.push({kind:body.kind,studioToken:headers.authorization,spatialToken:headers['x-urai-spatial-id-token']})
    const authorized=!settings.privateWrongStudio && !settings.privateDenied &&
      headers.authorization==='Bearer synthetic-studio-token-a' &&
      headers['x-urai-spatial-id-token']==='synthetic-sdk-token'
    if (!authorized) { await intercepted.fulfill({status:403,headers:{...cors,'Content-Type':'application/json'},
      body:'{"ok":false,"error":"synthetic_authority_denied"}'});return }
    const payload=body.kind==='mp4'?bytes:privateCaptions
    const digest=settings.privatePlaylistMismatch && body.kind==='srt'?'e'.repeat(64):privatePlaylistDigest
    await intercepted.fulfill({status:200,body:payload,headers:{...cors,
      'Content-Type':body.kind==='mp4'?'video/mp4':'application/x-subrip',
      'Content-Length':String(payload.length),'X-URAI-PRIVATE-PLAYLIST-DIGEST':digest}})
  })
  const query = route === '/spatial/captured-reality' ? `?assetId=synthetic-accepted-place${settings.standalone ? '' : `&memoryId=${memoryId}`}` : route === '/life-movie' ? `?movieId=synthetic-movie&memoryId=${memoryId}` : `?memoryId=${memoryId}${settings.dualPrivate ? '&manifestId=synthetic-manifest' : ''}`
  const privateQuery = settings.dualPrivate ? '&dualPrivate=1&movieId=synthetic-movie&lifeMoviePlanId='+privatePlanId+(settings.realHandler?'&realHandler=1':'')+(settings.segmentMode?'&segmentMode=1':'') : ''
  // Exact original production selector requires the selected memory manifest,
  // not merely movie+plan. The browser must exercise the real owner-bound route
  // through Replay; without this, no authorized Studio HTTP request is made.
  if (settings.dualPrivate && route === '/replay') {
    const selected = new URLSearchParams(query + privateQuery)
    assert.equal(selected.get('memoryId'), memoryId)
    assert.equal(selected.get('manifestId'), 'synthetic-manifest')
    assert.equal(selected.get('movieId'), 'synthetic-movie')
    assert.equal(selected.get('lifeMoviePlanId'), privatePlanId)
    for (const key of ['memoryId', 'manifestId', 'movieId', 'lifeMoviePlanId'])
      assert.equal(selected.getAll(key).length, 1, 'unique original private route selector: '+key)
  }
  // Arm response observation BEFORE navigation; a fast synthetic 403/SRT can
  // finish before open() returns. Never replace a missed response with a sleep.
  const observedPrivateResponse = (settings.privateWrongStudio || settings.privatePlaylistMismatch || settings.realHandlerForeignSpatial)
    ? page.waitForResponse(response => response.url().includes('/api/studio/spatial-private-media') &&
      response.request().method() === 'POST' &&
      JSON.parse(response.request().postData() ?? '{}').kind === (settings.privatePlaylistMismatch ? 'srt' : 'mp4'))
    : null
  await page.goto(origin + route + query + privateQuery)
  try {
    await page.waitForFunction(() => !!window.__fixtureIsConsentPolicy && !!window.__fixture)
    if(settings.realHandler) {
      await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0)
      const bootstrap = await page.evaluate(() => ({
        scripts:[...document.scripts].map(s => new URL(s.src,location.href).pathname),
        processExposed:typeof window.process !== 'undefined'
      }))
      assert.ok(bootstrap.scripts.includes(settings.segmentMode?'/fixture-segmented.js':'/fixture-integrated.js'),
        'Original Replay must mount from feature-enabled real-handler bundle')
      assert.equal(bootstrap.processExposed,false,
        'Nonproduction build shim must not expose Node process to the browser window')
      assert.deepEqual(bootstrapDiagnostics.filter(e => e.event === 'pageerror'),[],
        'Browser bootstrap must not throw uncaught JavaScript exceptions')
      console.log('PASS Original Replay integrated browser bootstrap: script, consent, React root, no pageerror')
    }
  } catch (error) {
    if (settings.realHandler) {
      // Preserve the true bootstrap defect; never fake SDK readiness.
      const probe = await page.evaluate(() => ({
        fixtureReady: !!window.__fixture,
        consentFunctionReady: !!window.__fixtureIsConsentPolicy,
        pathname: location.pathname,
        scriptPaths: [...document.scripts].map(s => new URL(s.src, location.href).pathname),
        rootMounted: !!document.querySelector('#root')?.childElementCount
      })).catch(e => ({ browserProbeFailed: String(e).slice(0, 300) }))
      const report = { probe, bootstrapDiagnostics }
      writeFileSync(path.join(output, 'original-replay-real-handler-bootstrap-failure.json'),
        JSON.stringify(report, null, 2))
      await page.screenshot({
        path: path.join(output, 'original-replay-real-handler-bootstrap-failure.png')
      }).catch(() => {})
      console.error('URAI_REAL_HANDLER_BROWSER_BOOTSTRAP_DIAGNOSTIC '+JSON.stringify(report))
    }
    throw error
  }
  assert.equal(await page.evaluate(() => {
    const f = window.__fixture, owner = f.auth.currentUser.uid
    return window.__fixtureIsConsentPolicy(f.docs[`users/${owner}/privacyPolicy/current`], owner)
  }), true, 'Synthetic positive playback must start from a valid canonical consent policy')
  return { page, context, privateRequests, realResponses, observedPrivateResponse }
}
async function check(name, task) { await task(); cases.push({ name, passed: true }); console.log(`PASS ${name}`) }
async function playable(page, element = 'video') { await page.waitForFunction(selector => { const source = document.querySelector(selector); return source?.readyState >= 2 && Number.isFinite(source.duration) && source.duration > 0 }, element) }
async function assertDisposed(page) {
  await page.waitForFunction(() => window.__fixture.revocations.length > 0)
  const result = await page.evaluate(() => window.__fixture.revocations)
  for (const item of result) for (const media of item.media) { assert.equal(media.paused, true); assert.equal(media.src, null) }
  assert.ok(result.some(item => item.media.length > 0), 'actual mounted media was stopped before Blob revocation')
}

// Read real mounted text by scrolling its existing region. Retain which positive
// text lines were actually visible and unobscured; never assign scrollTop/styles.
async function pointAtScrollableRegion(page, region, context) {
  const pointer = await region.evaluate(owner => {
    const r = owner.getBoundingClientRect()
    for (const [xFraction, yFraction] of [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) {
      const x = r.x + r.width * xFraction, y = r.y + r.height * yFraction
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
      const hit = document.elementFromPoint(x,y)
      if (hit === owner || owner.contains(hit)) return {x,y}
    }
    return null
  })
  assert.ok(pointer, JSON.stringify({ ...context, error:'Scrollable copy region has no unobscured pointer target' }))
  await page.mouse.move(pointer.x,pointer.y)
  return pointer
}

async function inspectScrollableCopy(page, { profile, regionSelector, textSelector, name }) {
  const region = page.locator(regionSelector)
  await pointAtScrollableRegion(page,region,{profile,name})
  await page.mouse.wheel(0, -10000)
  await page.waitForTimeout(50)
  const visited = new Set(), samples = []
  let expectedLines = 0
  for (let step = 0; step < 128; step++) {
    const sample = await region.evaluate((owner, selector) => {
      const region = owner.getBoundingClientRect()
      const elements = [...owner.querySelectorAll(selector)]
      const lines = elements.flatMap((element, elementIndex) => {
        const range = document.createRange(); range.selectNodeContents(element)
        return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).map((rect, lineIndex) => {
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
          return { id: `${elementIndex}:${lineIndex}`, x:rect.x,y:rect.y,width:rect.width,height:rect.height,
            visible: rect.left >= region.left && rect.right <= region.right &&
              rect.top >= region.top && rect.bottom <= region.bottom &&
              hit !== null && (hit === element || element.contains(hit)) }
        })
      })
      return { region:{x:region.x,y:region.y,width:region.width,height:region.height},
        text:elements.map(element => element.textContent), lines, scrollTop:owner.scrollTop,
        clientHeight:owner.clientHeight,scrollHeight:owner.scrollHeight,
        atEnd:Math.abs(owner.scrollTop+owner.clientHeight-owner.scrollHeight)<=1 }
    }, textSelector)
    assert.ok(sample.lines.length > 0, JSON.stringify({profile,name,sample}))
    expectedLines = sample.lines.length
    const previouslySeen = visited.size
    for (const line of sample.lines) if (line.visible) visited.add(line.id)
    if (visited.size > previouslySeen) {
      sample.screenshot = `synthetic-replay-${profile}-${name}-scroll-step-${step}.png`
      await page.screenshot({path:path.join(output,sample.screenshot)})
    }
    samples.push(sample)
    if (visited.size === expectedLines && sample.atEnd) break
    sample.wheelPointer = await pointAtScrollableRegion(page,region,{profile,name,step})
    await page.mouse.wheel(0, Math.max(8, Math.floor(sample.clientHeight / 3)))
    await page.waitForTimeout(50) // Allow a genuine wheel event to commit its scroll.
  }
  assert.equal(visited.size, expectedLines, JSON.stringify({profile,name,expectedLines,visited:[...visited],samples}))
  assert.equal(samples.at(-1).atEnd,true,JSON.stringify({profile,name,samples}))
  writeFileSync(path.join(output,`synthetic-replay-${profile}-${name}-geometry.json`),JSON.stringify({profile,name,regionSelector,textSelector,expectedLines,visitedLines:[...visited],samples},null,2))
  await page.screenshot({path:path.join(output,`synthetic-replay-${profile}-${name}.png`)})
}

try {
  await check('Replay uses actual reviewed English copy and rejects an unregistered locale key', async () => {
    const { page, context } = await open()
    try {
      await playable(page)
      const copy = await page.evaluate(() => {
        let missingRejected = false
        try { window.__fixtureLocaleText('replay.unregisteredSyntheticProbe') } catch { missingRejected = true }
        const pulse = document.querySelector('.memoryPulse')
        return {continue:window.__fixtureLocaleText('replay.continue'),pause:window.__fixtureLocaleText('replay.pause'),
          time:window.__fixtureLocaleText('replay.timeValue',{elapsed:'0:00',duration:'0:03'}),missingRejected,
          pulse:pulse.textContent.trim(),lang:pulse.lang,dir:pulse.dir,
          rawKeyVisible:document.body.textContent.includes('replay.continue')}
      })
      assert.equal(copy.continue,'Continue memory')
      assert.equal(copy.pause,'Pause memory')
      assert.equal(copy.time,'0:00 of 0:03')
      assert.equal(copy.missingRejected,true)
      assert.ok(copy.pulse.endsWith(copy.continue),JSON.stringify(copy))
      assert.equal(copy.lang,'en');assert.equal(copy.dir,'ltr');assert.equal(copy.rawKeyVisible,false)
      writeFileSync(path.join(output,'synthetic-replay-actual-locale-copy.json'),JSON.stringify(copy,null,2))
    } finally { await context.close() }
  })
  await check('Replay selects a receipt Blob only after full SHA and length verification; decoded media owns play, pause and seek', async () => {
    const { page, context } = await open(); await playable(page)
    assert.deepEqual(await page.evaluate(() => window.__fixture.creates.map(({ type, size }) => ({ type, size }))), [{ type: 'video/mp4', size: bytes.length }])
    await page.locator('.memoryPulse').click()
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="cinematic-replay-client"]').dataset.currentTimeMs) > 300)
    const clock = await page.evaluate(() => ({ decoded: Math.round(document.querySelector('video').currentTime * 1000), reported: Number(document.querySelector('[data-testid="cinematic-replay-client"]').dataset.currentTimeMs) }))
    assert.ok(Math.abs(clock.decoded - clock.reported) < 150, JSON.stringify(clock))
    await page.locator('.memoryPulse').click(); const paused = await page.locator('video').evaluate(v => v.currentTime); await page.waitForTimeout(220)
    assert.ok(Math.abs(await page.locator('video').evaluate(v => v.currentTime) - paused) < .03)
    await page.locator('.memorySeek').evaluate(input => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'1500'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})) })
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 1.5) < .1)
    await page.screenshot({ path: path.join(output, 'synthetic-replay-desktop.png') })
    await page.evaluate(() => window.__fixture.setReplayVisible(false))
    await assertDisposed(page); assert.equal(await page.getByText('Synthetic receipt source — not family media', { exact: true }).count(), 0)
    await context.close()
  })
  await check('Original Replay decodes dual-session Studio-protected MP4 and matching captions in real Chromium',async()=>{
    const {page,context,privateRequests}=await open('/replay',{dualPrivate:true})
    try{
      const captions=page.locator('[data-private-life-movie-captions="verified"]')
      await captions.waitFor()
      // The real Replay presents protected SRT in a collapsed <details>. Open
      // its existing accessible disclosure before inspecting the mounted cue.
      await captions.locator('summary').click()
      const visibleCue = captions.locator('pre')
      await visibleCue.waitFor({ state: 'visible' })
      assert.match(await visibleCue.innerText(),/Fictional matched protected memory caption/)
      const source=page.locator('video[aria-label="Authorized private Life Movie"]')
      await source.waitFor()
      await playable(page,'video[aria-label="Authorized private Life Movie"]')
      assert.deepEqual(privateRequests.map(r=>r.kind),['mp4','srt'])
      for(const r of privateRequests) {
        assert.equal(r.studioToken,'Bearer synthetic-studio-token-a')
        assert.equal(r.spatialToken,'synthetic-sdk-token')
      }
      await page.locator('.memoryPulse').click()
      await page.waitForFunction(()=>Number(document.querySelector('[data-testid="cinematic-replay-client"]').dataset.currentTimeMs)>300)
      await page.locator('.memoryPulse').click()
      const pause=await source.evaluate(element=>element.currentTime)
      await page.waitForTimeout(180)
      assert.ok(Math.abs(await source.evaluate(element=>element.currentTime)-pause)<0.04)
      await page.screenshot({path:path.join(output,'synthetic-original-dual-identity-replay.png')})
      await page.evaluate(()=>window.__fixture.emitStudioAuth(null))
      await page.waitForFunction(()=>!document.querySelector('[data-private-life-movie-captions="verified"]'))
      assert.equal(await page.locator('video[aria-label="Authorized private Life Movie"]').count(),0)
      assert.ok(await page.evaluate(()=>window.__fixture.revocations.some(v=>v.media.length>0)))
      await page.locator('.unwind').click()
      assert.equal(await page.evaluate(()=>window.__fixture.worldReturnRequests),1)
    } finally {await context.close()}
  })
  await check('Wrong Studio user receives no protected output or captions in original Replay',async()=>{
    const {page,context,privateRequests,observedPrivateResponse}=await open('/replay',{dualPrivate:true,privateWrongStudio:true})
    try {
      const denied = await observedPrivateResponse
      assert.equal(denied.status(),403,'wrong Studio user must get explicit HTTP denial')
      assert.equal(denied.headers()['content-type'],'application/json')
      assert.equal((await denied.body()).includes(bytes),false,'denial cannot contain private MP4 bytes')
      assert.equal(privateRequests.length,1)
      assert.equal(privateRequests[0].studioToken,'Bearer synthetic-studio-token-b')
      assert.equal(await page.locator('[data-private-life-movie-captions="verified"]').count(),0)
      assert.equal(await page.locator('video[aria-label="Authorized private Life Movie"]').count(),0)
    } finally {await context.close()}
  })
  await check('Mismatched protected MP4 and SRT playlist identity releases no private video',async()=>{
    const {page,context,privateRequests,observedPrivateResponse}=await open('/replay',{dualPrivate:true,privatePlaylistMismatch:true})
    try {
      const captionsResponse = await observedPrivateResponse
      assert.equal(captionsResponse.status(),200,'mismatched captions must reach the client integrity check')
      assert.equal(captionsResponse.headers()['x-urai-private-playlist-digest'],'e'.repeat(64))
      assert.deepEqual(privateRequests.map(r=>r.kind),['mp4','srt'])
      assert.equal(await page.locator('[data-private-life-movie-captions="verified"]').count(),0)
      assert.equal(await page.locator('video[aria-label="Authorized private Life Movie"]').count(),0)
    } finally {await context.close()}
  })

  // This runs ONLY under Video Factory's explicitly isolated, pinned local
  // Studio-handler bridge. The protected Studio route is never intercepted.
  if(realStudioOrigin) {
    const authenticVideo=readFileSync(process.env.URAI_JOBS_SYNTH_MP4)
    const authenticSrt=readFileSync(process.env.URAI_JOBS_SYNTH_SRT,'utf8')
    await check('Original Chromium Replay delivers pinned Jobs MP4/SRT through ACTUAL Studio HTTP POST handler',async()=>{
      const {page,context,privateRequests,realResponses}=await open('/replay',{dualPrivate:true,realHandler:true})
      try{
        const captions=page.locator('[data-private-life-movie-captions="verified"]')
        try {
          await captions.waitFor()
        } catch (error) {
          // Retain the actual network statuses and server boundary evidence.
          // Never include authorization headers, tokens or response bytes.
          const report = {
            privateRequests, realResponses,
            videoCount:await page.locator('video[aria-label="Authorized private Life Movie"]').count(),
            captionsCount:await captions.count(),
            bootstrapErrors:errors.slice(-5).map(x=>String(x).slice(0,500)),
            pagePath:await page.evaluate(()=>location.pathname)
          }
          writeFileSync(path.join(output,'original-replay-actual-handler-delivery-failure.json'),
            JSON.stringify(report,null,2))
          console.error('URAI_REAL_HANDLER_DELIVERY_DIAGNOSTIC '+JSON.stringify(report))
          throw error
        }
        await captions.locator('summary').click()
        const cue=captions.locator('pre')
        await cue.waitFor({state:'visible'})
        assert.equal((await cue.innerText()).trim(),authenticSrt.trim())
        const video=page.locator('video[aria-label="Authorized private Life Movie"]')
        await video.waitFor()
        await playable(page,'video[aria-label="Authorized private Life Movie"]')
        assert.deepEqual(privateRequests.map(r=>r.kind),['mp4','srt'])
        assert.deepEqual(realResponses.filter(r=>r.method==='POST').map(r=>r.status),[200,200])
        const media=realResponses.filter(r=>r.method==='POST')
        assert.deepEqual(media.map(r=>r.contentType),['video/mp4','application/x-subrip'])
        assert.equal(Number(media[0].contentLength),authenticVideo.length)
        assert.equal(Number(media[1].contentLength),Buffer.byteLength(authenticSrt))
        assert.equal(media[0].playlistDigest,media[1].playlistDigest)
        assert.match(media[0].playlistDigest,/^[a-f0-9]{64}$/)
        assert.ok(media.every(r=>r.cors===origin),'actual HTTP response must permit only the bound Spatial origin')
        const decoded=await video.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration}))
        assert.ok(decoded.width>0&&decoded.height>0&&decoded.duration>2,JSON.stringify(decoded))
        assert.ok((await page.evaluate(()=>window.__fixture.creates))
          .some(b=>b.type==='video/mp4'&&b.size===authenticVideo.length))
        await page.locator('.memoryPulse').click()
        await page.waitForFunction(()=>document.querySelector('video[aria-label="Authorized private Life Movie"]')?.currentTime>.4)
        await page.locator('.memoryPulse').click()
        const stopped=await video.evaluate(v=>v.currentTime)
        await page.waitForTimeout(180)
        assert.ok(Math.abs((await video.evaluate(v=>v.currentTime))-stopped)<.05)
        await page.locator('.memoryPulse').click()
        await page.waitForFunction(t=>document.querySelector('video[aria-label="Authorized private Life Movie"]')?.currentTime>t+.1,stopped)
        await page.screenshot({path:path.join(output,'original-replay-actual-studio-handler.png')})
        writeFileSync(path.join(output,'original-replay-actual-studio-http.json'),JSON.stringify({
          spatialOrigin:origin,studioOrigin:realStudioOrigin,requests:privateRequests,responses:realResponses,
          videoSha256:createHash('sha256').update(authenticVideo).digest('hex'),
          decoded,captionsMatched:true,pausedAndResumed:true,
          firebaseProvider:'synthetic',jobsProvider:'synthetic-owned-http',j9Accepted:false
        },null,2))
        await page.evaluate(()=>window.__fixture.emitStudioAuth(null))
        await page.waitForFunction(()=>!document.querySelector('video[aria-label="Authorized private Life Movie"]'))
        assert.ok(await page.evaluate(()=>window.__fixture.revocations.some(v=>v.media.length>0)))
        await page.locator('.unwind').click()
        assert.equal(await page.evaluate(()=>window.__fixture.worldReturnRequests),1)
      }finally{await context.close()}
    })
    if(process.env.URAI_STUDIO_PROTECTED_MULTI_SEGMENT_BROWSER_LOOPBACK==='true'){
      await check('Original Replay three-segment Chromium seeks forward and backward over ACTUAL Studio HTTP',async()=>{
        const {page,context,privateRequests,realResponses}=await open('/replay',
          {dualPrivate:true,realHandler:true,segmentMode:true})
        try {
          const movie=page.locator('[data-testid="cinematic-replay-client"]')
          const privateDiagnostics=[]
          page.on('console',message=>{
            const value=message.text()
            if(value.startsWith('URAI_SEGMENT_DEV_DIAGNOSTIC ')) privateDiagnostics.push(value.slice(0,160))
          })
          try {
            await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.privateSegmentIndex==='0')
          } catch (error) {
            const dom=await page.evaluate(()=>{
              const main=document.querySelector('[data-testid="cinematic-replay-client"]')
              return {found:!!main,segmentIndex:main?.getAttribute('data-private-segment-index')??null,
                status:main?.getAttribute('data-replay-media-status')??null,
                videoCount:document.querySelectorAll('video[aria-label="Authorized private Life Movie"]').length,
                captionCount:document.querySelectorAll('[data-private-life-movie-captions]').length,
                createdVideoBlobs:window.__fixture?.creates?.filter(v=>v.type==='video/mp4').length??null,
                revokedMediaUrls:window.__fixture?.revocations?.length??null}
            })
            const diagnostic={kind:'synthetic-multisegment-local-browser-initial-state',
              requests:privateRequests.map(v=>({action:v.action,kind:v.kind,segmentIndex:v.segmentIndex})),
              responses:realResponses.map(v=>({action:v.action,kind:v.kind,segmentIndex:v.segmentIndex,
                status:v.status,contentType:v.contentType,contentLength:v.contentLength,
                playlistDigestPresent:typeof v.playlistDigest==='string'})),
              dom,privateDiagnostics}
            writeFileSync(path.join(output,'original-replay-multisegment-initial-failure.json'),
              JSON.stringify(diagnostic,null,2))
            console.error('URAI_MULTISEGMENT_INITIAL_DIAGNOSTIC '+JSON.stringify(diagnostic))
            throw error
          }
          await playable(page,'video[aria-label="Authorized private Life Movie"]')
          // The pinned Jobs SRT has NO text at t=0: its first cue starts at
          // 400 ms and says "This is a synthetic UrAi narration." The
          // previous "Fictional" expectation belonged to an unrelated shim
          // and could never prove real Jobs caption synchronization.
          assert.match(authenticSrt,/00:00:00,400 --> 00:00:02,300\s+This is a synthetic UrAi narration\./)
          const localCaption=page.locator('[data-private-life-movie-live-caption="verified"]')
          assert.equal((await localCaption.textContent())?.trim(),'',
            'no private cue may display before its segment-local start')
          const setSeek=async(ms)=>{
            await page.locator('.memorySeek').evaluate((input,value)=>{
              const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set
              setter.call(input,String(value))
              input.dispatchEvent(new Event('input',{bubbles:true}))
              input.dispatchEvent(new Event('change',{bubbles:true}))
            },ms)
          }
          await setSeek(1000)
          await page.waitForFunction(()=>document.querySelector('[data-private-life-movie-live-caption="verified"]')?.textContent?.trim()==='This is a synthetic UrAi narration.')
          const cueClock=Number(await movie.getAttribute('data-current-time-ms'))
          assert.ok(cueClock>=400&&cueClock<2300,
            'first Jobs cue must synchronize to the decoded original Replay clock')
          assert.deepEqual(privateRequests.slice(0,3).map(x=>[x.action,x.kind,x.segmentIndex]),
            [['read-spatial-timeline',undefined,null],['deliver-spatial-segment','mp4',0],['deliver-spatial-segment','srt',0]])
          const first=await page.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight}))
          assert.ok(first.width>0&&first.height>0)
          await page.locator('.memoryPulse').click()
          await page.waitForFunction(()=>Number(document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.currentTimeMs)>300)
          await page.locator('.memoryPulse').click()
          const paused=await page.locator('video').evaluate(v=>v.currentTime)
          await page.waitForTimeout(180)
          assert.ok(Math.abs((await page.locator('video').evaluate(v=>v.currentTime))-paused)<.06)
          await setSeek(7500)
          await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.privateSegmentIndex==='1')
          await playable(page,'video[aria-label="Authorized private Life Movie"]')
          await page.waitForFunction(()=>document.querySelector('[data-private-life-movie-live-caption]')?.textContent?.includes('middle'))
          assert.ok(privateRequests.some(r=>r.action==='deliver-spatial-segment'&&r.segmentIndex===1&&r.kind==='mp4'))
          await setSeek(13000)
          await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.privateSegmentIndex==='2')
          await playable(page,'video[aria-label="Authorized private Life Movie"]')
          await page.waitForFunction(()=>document.querySelector('[data-private-life-movie-live-caption]')?.textContent?.includes('ending'))
          await setSeek(500)
          await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.privateSegmentIndex==='0')
          await playable(page,'video[aria-label="Authorized private Life Movie"]')
          try {
            await page.waitForFunction(()=>{
              const video=document.querySelector('video[aria-label="Authorized private Life Movie"]')
              const replay=document.querySelector('[data-testid="cinematic-replay-client"]')
              return !!video && !video.seeking && Math.abs(video.currentTime*1000-500)<=100 &&
                Math.abs(Number(replay?.dataset.currentTimeMs)-500)<=100
            })
            await page.waitForFunction(()=>document.querySelector('[data-private-life-movie-live-caption="verified"]')?.textContent?.trim()==='This is a synthetic UrAi narration.')
          } catch (error) {
            // Real mounted media and React state only. No identities, storage
            // paths, auth headers, caption bytes, or private media are exported.
            const playback=await page.evaluate(()=>{
              const main=document.querySelector('[data-testid="cinematic-replay-client"]')
              const video=document.querySelector('video[aria-label="Authorized private Life Movie"]')
              const cue=document.querySelector('[data-private-life-movie-live-caption="verified"]')
              return {index:main?.getAttribute('data-private-segment-index')??null,
                globalTimeMs:main?.getAttribute('data-current-time-ms')??null,
                mediaStatus:main?.getAttribute('data-replay-media-status')??null,
                mediaReady:main?.getAttribute('data-replay-media-ready')??null,
                videoPresent:!!video,videoLocalTimeMs:video?Math.round(video.currentTime*1000):null,
                videoDurationMs:video?Math.round(video.duration*1000):null,
                videoReadyState:video?.readyState??null,videoSeeking:video?.seeking??null,
                videoPaused:video?.paused??null,
                captionActive:!!cue?.textContent?.trim(),
                expectedCueVisible:cue?.textContent?.trim()==='This is a synthetic UrAi narration.',
                createdVideoBlobs:window.__fixture?.creates?.filter(x=>x.type==='video/mp4').length??null,
                revokedUrls:window.__fixture?.revocations?.length??null}
            })
            const receipt={kind:'synthetic-multisegment-backward-seek-caption',
              playback,
              requests:privateRequests.map(x=>({action:x.action,kind:x.kind,segmentIndex:x.segmentIndex})),
              responses:realResponses.filter(x=>x.method==='POST').map(x=>({
                action:x.action,kind:x.kind,segmentIndex:x.segmentIndex,status:x.status}))}
            writeFileSync(path.join(output,'original-replay-multisegment-backward-caption-failure.json'),
              JSON.stringify(receipt,null,2))
            console.error('URAI_MULTISEGMENT_BACKWARD_CAPTION_DIAGNOSTIC '+JSON.stringify(receipt))
            throw error
          }
          assert.ok(Number(await movie.getAttribute('data-current-time-ms'))>=400,
            'backward seek must restore the first protected Jobs cue at a valid global time')
          const delivered=realResponses.filter(r=>r.action==='deliver-spatial-segment')
          assert.ok(delivered.length>=8&&delivered.every(r=>r.status===200))
          await page.screenshot({path:path.join(output,'original-replay-real-multisegment-chromium.png')})
          writeFileSync(path.join(output,'original-replay-real-multisegment.json'),JSON.stringify({
            source:'actual Studio exported route, fictional identities',
            requests:privateRequests,responses:realResponses,decoded:first,
            forwardSeek:true,backwardSeek:true,captionsContinuity:true,cloudJ9:false
          },null,2))
          await page.evaluate(()=>window.__fixture.emitStudioAuth(null))
          await page.waitForFunction(()=>!document.querySelector('[data-private-life-movie-live-caption]'))
          await page.waitForFunction(()=>!document.querySelector('video[aria-label="Authorized private Life Movie"]'))
          assert.ok(await page.evaluate(()=>window.__fixture.revocations.some(x=>x.media.length>0)))
          await page.locator('.unwind').click()
          assert.equal(await page.evaluate(()=>window.__fixture.worldReturnRequests),1)
        }finally{await context.close()}
      })
    }
    for(const [label,settings] of [
      ['wrong Studio user',{privateWrongStudio:true}],
      ['foreign Spatial token',{realHandlerForeignSpatial:true}]
    ])await check('Actual Studio exported handler denies '+label+' without MP4 or captions',async()=>{
      const {page,context,privateRequests,realResponses,observedPrivateResponse}=
        await open('/replay',{dualPrivate:true,realHandler:true,...settings})
      try{
        const denied=await observedPrivateResponse
        assert.equal(denied.status(),403,'actual handler must deny foreign principal')
        assert.equal(denied.headers()['content-type'],'application/json',
          'server must not label denied output as protected media')
        assert.match(denied.headers()['cache-control']??'',/no-store/,
          'denied authority must not be cached')
        assert.equal(denied.headers()['x-urai-private-playlist-digest'],undefined,
          'denial must not disclose protected playlist identity')
        assert.equal(denied.headers()['access-control-allow-origin'],origin,
          'approved origin must receive and enforce the actual 403')
        // Chromium may cancel the rejected fetch before CDP can retain its
        // response body. The SAME HTTP server bridge independently reads every
        // denied response and asserts exact JSON denial, no protected MP4/SRT
        // bytes, and emits an auditable zero-disclosure receipt. Do not replace
        // that server assertion with Playwright's unreliable Network.getResponseBody.
        assert.deepEqual(privateRequests.map(x=>x.kind),['mp4'])
        assert.deepEqual(realResponses.filter(r=>r.method==='POST').map(r=>r.status),[403])
        const privateMediaMounted=await page.evaluate(expectedSize =>
          window.__fixture.creates.some(item=>item.type==='video/mp4' && item.size===expectedSize),
          authenticVideo.length)
        assert.equal(privateMediaMounted,false,'denied browser must create no protected video Blob')
        assert.equal(await page.locator('video[aria-label="Authorized private Life Movie"]').count(),0)
        assert.equal(await page.locator('[data-private-life-movie-captions="verified"]').count(),0)
      }finally{await context.close()}
    })
  }
  const longNarration = "Synthetic narration fixture only. This complete narration deliberately exceeds two lines on a narrow viewport. It is retained as real mounted copy so every sentence must become visible through the caption region's own scrolling. No family recording, person, private runtime, movie, or world is accepted by these synthetic words. The final sentence must remain reachable alongside the memory controls."
  for (const profile of [
    { name: 'desktop', viewport: { width: 1280, height: 800 } },
    { name: 'expanded-title-desktop', viewport: { width: 1280, height: 800 }, title: 'Synthetic receipt source — not family media: a retained expanded-title navigation fixture whose complete title remains available while journey controls stay reachable.' },
    { name: 'mobile', narration:longNarration, viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'small-mobile', narration:longNarration, viewport: { width: 320, height: 568 }, mobile: true },
    { name: 'landscape', viewport: { width: 844, height: 390 } },
    { name: 'short-viewport', narration:longNarration, viewport: { width: 320, height: 320 } },
  ]) await check(`Long-title Replay preserves visible, pointer-reachable journey controls on ${profile.name}`, async () => {
    const { page, context } = await open('/replay', { ...profile,
      title: profile.title ?? 'Synthetic receipt source — not family media' })
    try {
      await playable(page)
      assert.equal(await page.locator('.caption span').textContent(),profile.narration ?? 'Synthetic narration caption only')
      for (const selector of ['.unwind', '.replayLifeMovieEntry']) {
        const control = page.locator(selector)
        await control.scrollIntoViewIfNeeded()
        const geometry = await control.evaluate(button => {
          const r = button.getBoundingClientRect(), notice = document.querySelector('.replaySourceStatus'), n = notice.getBoundingClientRect()
          const points = [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]
          return { control: { x:r.x,y:r.y,width:r.width,height:r.height },
            overlapsNotice: r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top,
            reachable: points.every(([x,y]) => { const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return hit===button||button.contains(hit) }) }
        })
        assert.equal(geometry.overlapsNotice,false,JSON.stringify({profile:profile.name,selector,...geometry}))
        assert.equal(geometry.reachable,true,JSON.stringify({profile:profile.name,selector,...geometry}))
        assert.ok(geometry.control.height>=48,JSON.stringify(geometry))
        await control.focus();assert.equal(await control.evaluate(button=>button===document.activeElement),true)
        await control.click() // No force: exercise real mounted control hit testing.
      }
      const journey=await page.evaluate(()=>({travel:window.__fixture.worldTravel,returns:window.__fixture.worldReturnRequests}))
      assert.equal(journey.returns,1)
      assert.equal(journey.travel.destination,'life-movie')
      assert.equal(new URL(journey.travel.href,'https://synthetic.invalid').searchParams.get('memoryId'),memoryId)
      assert.equal(await page.locator('.replaySourceStatus strong').textContent(),'Recorded source · original framing')
      await page.screenshot({path:path.join(output,`synthetic-replay-long-title-${profile.name}.png`)})
      const narrationGeometry = await page.evaluate(() => {
        const caption = document.querySelector('.caption').getBoundingClientRect()
        const controls = document.querySelector('.memoryTempo').getBoundingClientRect()
        const header = document.querySelector('.replayWorld header').getBoundingClientRect()
        return { header:{x:header.x,y:header.y,right:header.right,bottom:header.bottom},
          overlapsHeader:caption.left<header.right&&caption.right>header.left&&caption.top<header.bottom&&caption.bottom>header.top,
          caption:{x:caption.x,y:caption.y,right:caption.right,bottom:caption.bottom},
          controls:{x:controls.x,y:controls.y,right:controls.right,bottom:controls.bottom},
          overlap:caption.left<controls.right&&caption.right>controls.left&&caption.top<controls.bottom&&caption.bottom>controls.top }
      })
      assert.equal(narrationGeometry.overlap,false,JSON.stringify({profile:profile.name,...narrationGeometry}))
      assert.equal(narrationGeometry.overlapsHeader,false,JSON.stringify({profile:profile.name,...narrationGeometry}))
      writeFileSync(path.join(output,`synthetic-replay-${profile.name}-caption-control-geometry.json`),JSON.stringify(narrationGeometry,null,2))
      await inspectScrollableCopy(page,{profile:profile.name,regionSelector:'.replayWorld header',textSelector:'.replaySourceStatus strong,.replaySourceStatus span',name:'source-notice'})
      await inspectScrollableCopy(page,{profile:profile.name,regionSelector:'.caption',textSelector:'small,strong,span',name:'caption-copy'})

    } finally { await context.close() }
  })
  await check('Life Movie uses the same decoded output clock and stops on live manifest withdrawal on mobile', async () => {
    const { page, context } = await open('/life-movie', { mobile: true }); await playable(page)
    await page.locator('.lifeMovieControls button').filter({ hasText: 'Play' }).click()
    await page.waitForFunction(() => document.querySelector('video').currentTime > .3 && !document.querySelector('video').paused)
    const status = await page.locator('[data-testid="life-movie-runtime"]').getAttribute('data-state'); assert.equal(status, 'ready')
    await page.screenshot({ path: path.join(output, 'synthetic-life-movie-mobile.png') })
    await page.evaluate(() => { const f=window.__fixture,p=`users/${f.auth.currentUser.uid}/lifeMovies/synthetic-movie`;f.update(p,{...f.docs[p],consentState:'revoked'}) })
    await assertDisposed(page); await page.waitForFunction(() => !document.querySelector('video'))
    await context.close()
  })
  await check('Audio-only receipt uses actual decoded media and respects low-stimulation sound withdrawal', async () => {
    const { page, context } = await open('/replay', { audio: true }); await playable(page, 'audio')
    await page.locator('.memoryAudio').click(); assert.equal(await page.locator('audio').evaluate(v => v.muted), false)
    await page.evaluate(() => { localStorage.setItem('urai:sensory-safe:enabled-v1','true');dispatchEvent(new CustomEvent('urai:sensory-safe-changed',{detail:{enabled:true}})) })
    assert.equal(await page.locator('audio').evaluate(v => v.muted), true)
    await page.evaluate(() => window.__unmount()); await assertDisposed(page); await context.close()
  })
  await check('Life Movie returns to Play film when a private media receipt is withdrawn during playback', async () => {
    const { page, context } = await open('/life-movie', { mobile: true }); await playable(page)
    await page.getByRole('button', { name: 'Play film', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('video').currentTime > .3 && !document.querySelector('video').paused)
    await page.evaluate(() => { const f=window.__fixture,p=`users/${f.auth.currentUser.uid}/memoryMediaReceipts/${'a'.repeat(64)}`; f.update(p,{...f.docs[p],state:'revoked'}) })
    await assertDisposed(page)
    await page.getByRole('button', { name: 'Play film', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Play film', exact: true }).getAttribute('aria-pressed'), 'false')
    await context.close()
  })
  for (const [label, mutation] of [
    // A fully schema-valid Memory permission withdrawal must stop an already
    // decoded owned-media Blob; a malformed policy is not a revocation proof.
    ['canonical revision-2 Memory permission denied', `const p=base+'/privacyPolicy/current';const previous=f.docs[p];const next={...previous,revision:previous.revision+1,domains:{...previous.domains,memory:{...previous.domains.memory,mode:'denied'}}};if(!window.__fixtureIsConsentPolicy(next,f.auth.currentUser.uid))throw Error('CANONICAL_MEMORY_WITHDRAWAL_FIXTURE_INVALID');f.update(p,next)`],
    ['canonical C1 status revoked', `const p='consentRecords/'+f.auth.currentUser.uid+'_memory_storage';f.update(p,{...f.docs[p],status:'revoked'})`],
    ['canonical C1 receipt hash replaced', `const p='consentRecords/'+f.auth.currentUser.uid+'_memory_storage';f.update(p,{...f.docs[p],receiptHash:'e'.repeat(64)})`],
    ['canonical C1 expiry replaced', `const p='consentRecords/'+f.auth.currentUser.uid+'_memory_storage';f.update(p,{...f.docs[p],expiresAt:Date.now()-1})`],
    ['canonical C1 deleted', `const p='consentRecords/'+f.auth.currentUser.uid+'_memory_storage';f.update(p,null)`],
    ['canonical C1 subscription permission denied', `const p='consentRecords/'+f.auth.currentUser.uid+'_memory_storage';for(const watcher of [...f.watchers])if(watcher.p===p)watcher.error(new Error('synthetic permission-denied'))`],

    ['immutable receipt authority changed with unchanged bytes', `const p=base+'/memoryMediaReceipts/${receiptId}';f.update(p,{...f.docs[p],attemptNonce:'changed'})`],
    ['same-UID account recreation', `f.denyAuthority=true;f.emitAuth({uid:f.auth.currentUser.uid,getIdToken:async()=> 'synthetic-sdk-token'})`],
    ['owner memory hidden', `const p=base+'/memories/${memoryId}';f.update(p,{...f.docs[p],privacy:'hidden'})`],
    ['owner memory deleted', `const p=base+'/memories/${memoryId}';f.update(p,{...f.docs[p],deleted:true})`],
  ]) await check(`Mounted Replay disposes before URL revocation when ${label}`, async () => {
    const { page, context } = await open(); await playable(page)
    await page.evaluate(script => { const f=window.__fixture,base=`users/${f.auth.currentUser.uid}`;new Function('f','base',script)(f,base) },mutation)
    await assertDisposed(page); await context.close()
  })
  await check('Private source expiry stops mounted bytes without waiting for the server poll', async () => {
    const { page, context } = await open('/replay',{expiry:true}); await playable(page); await assertDisposed(page); await context.close()
  })
  await check('Exact-generation tampered bytes never become a Blob or decoded source', async () => {
    const { page, context } = await open('/replay',{tamper:true}); await page.getByText('The private source is currently unavailable.',{exact:true}).waitFor()
    assert.equal(await page.evaluate(()=>window.__fixture.creates.length),0); assert.equal(await page.locator('video').count(),0); await context.close()
  })
  await check('Unmount before all owner snapshots settles the pending mount and ignores late callbacks', async () => {
    const { page, context } = await open('/replay',{hold:true}); await page.waitForFunction(()=>window.__fixture.watchers.size>=8)
    await page.evaluate(()=>{window.__unmount();const f=window.__fixture;for(const w of f.allWatchers)w.callback({exists:()=>true,data:()=>structuredClone(f.docs[w.p]),get:()=>undefined})})
    assert.equal(await page.evaluate(()=>window.__fixture.watchers.size),0); assert.equal(await page.evaluate(()=>window.__fixture.creates.length),0); await context.close()
  })
  for (const field of ['privacy','deleted','replayVisible']) await check(`Mounted query-memory captured route suppresses on ${field} withdrawal`, async () => {
    const { page, context } = await open('/spatial/captured-reality'); await page.locator('[data-testid="captured-reality-private-route"][data-state="ready"]').waitFor()
    assert.equal(await page.evaluate(() => window.__fixture.calls.filter(x => x.name === 'getCapturedRealityMeshUrl').length), 1, 'Private route must request live mesh authority before honoring explicit disabled-mesh transport fixture')
    await page.evaluate(({field,memoryId})=>{const f=window.__fixture,base=`users/${f.auth.currentUser.uid}`,p=field==='replayVisible'?base+'/privacyPolicy/current':base+'/memories/'+memoryId; const old=f.docs[p];if(field==='replayVisible')f.setReplayVisible(false);else f.update(p,{...old,[field]:field==='privacy'?'hidden':true})},{field,memoryId})
    await page.locator('[data-testid="captured-reality-private-route"][data-state="suppressed"]').waitFor();assert.ok(await page.evaluate(()=>window.__fixture.sceneDisposals>0));await context.close()
  })
  await check('Standalone captured place does not acquire a Replay-memory requirement',async()=>{
    const {page,context}=await open('/spatial/captured-reality',{standalone:true});await page.locator('[data-testid="captured-reality-private-route"][data-state="ready"]').waitFor()
    await page.evaluate(()=>window.__fixture.setReplayVisible(false))
    assert.equal(await page.locator('[data-testid="captured-reality-private-route"]').getAttribute('data-state'),'ready');await context.close()
  })
  assert.deepEqual(errors,[], 'actual bundled React consumer has no page errors')
} finally {
  await browser.close(); await new Promise(resolve=>server.close(resolve))
  const sources = [...new Set(compiled.metafile ? Object.keys(compiled.metafile.inputs) : [])]
  writeFileSync(path.join(output,'receipt.json'),JSON.stringify({schemaVersion:'urai-owned-memory-playback-browser-proof-v1',synthetic:true,privateFamilyUsed:false,worldAccepted:false,identityAccepted:false,nativePositivePrivatePlaybackAccepted:false,fixture:{sha256:fixture.sha256,byteLength:fixture.byteLength},cases,errors,sources,scope:'Actual React consumers, receipt adapter and Chromium decoding; Firebase SDK and unrelated world/assistant boundary fixtures. Captured scene renderer is a disposal sentinel, not GPU/world acceptance.',serverOnlyRevalidationIntervalMs:30000},null,2)+'\n')
}
