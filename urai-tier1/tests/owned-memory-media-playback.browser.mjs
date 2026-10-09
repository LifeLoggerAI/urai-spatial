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
  'firebase/auth': `export const getAuth=()=>window.__fixture.auth; export const onAuthStateChanged=(auth,callback)=>{window.__fixture.authObservers.add(callback);queueMicrotask(()=>callback(auth.currentUser));return()=>window.__fixture.authObservers.delete(callback)};`,
  'firebase/firestore': `export { Timestamp } from '@firebase/firestore';const snap=(p)=>{const v=window.__fixture.docs[p];return {id:p.split('/').at(-1),exists:()=>v!=null,data:()=>v==null?undefined:structuredClone(v),get:(k)=>k.split('.').reduce((x,key)=>x?.[key],v)}};export const doc=(db,...p)=>p.join('/');export const collection=(db,...p)=>p.join('/');export const limit=()=>null;export const query=(p)=>p;export const getDoc=async p=>snap(p);export const getDocs=async p=>({docs:Object.keys(window.__fixture.docs).filter(k=>k.startsWith(p+'/')&&k.slice(p.length+1).indexOf('/')<0).map(snap)});export const onSnapshot=(p,callback,error)=>{const w={p,callback,error};window.__fixture.watchers.add(w);window.__fixture.allWatchers.push(w);if(!window.__fixture.holdSnapshots.includes(p))queueMicrotask(()=>callback(snap(p)));return()=>window.__fixture.watchers.delete(w)};export const __snapshot=snap;`,
  'firebase/functions': `export const httpsCallable=(functions,name)=>async data=>({data:await window.__fixture.call(name,data)});`,
  '@/lib/firebase/client': `export const app={options:{projectId:'urai-4dc1d'}};export const firebasePublicEnvReady=true;export const functions={};export const getFirebaseDb=()=>({});`,
  '@react-three/fiber': `export function Canvas(){return null};export function useFrame(){}`, 
  '@/spatial/assets/uraiAssets': `export const replayAssets={primary:{src:'/disclosed-unused-demo.png'}};`,
  '@/spatial/adam/AdamLauncherSlot': `export default function AdamLauncherSlot(){return null}`, 
  '@/spatial/life-model/useReplayLifeModelAuthority': `export const useReplayLifeModelAuthority=()=>({available:false,status:'unavailable',people:[]});`,
  '@/spatial/interpretive-world/useInterpretiveWorldReplayEntry': `export const useInterpretiveWorldReplayEntry=()=>null;`,
  '@/spatial/performance/useAdaptiveSpatialQuality': `export const useAdaptiveSpatialQuality=()=>({shadows:false,pixelRatioMax:1,documentVisible:true,reducedMotion:true,antialias:false});`,
  '@/spatial/world/WorldStateProvider': `export const useUraiWorldState=()=>({world:{previousDestination:'focus'}});`,
  '@/spatial/world/worldEvents': `export const requestUraiWorldTravel=value=>{window.__fixture.worldTravel=value};export const requestUraiWorldReturn=()=>{window.__fixture.worldReturnRequests=(window.__fixture.worldReturnRequests??0)+1};`,
  '@/lib/i18n/useUraiLocale': `const text=(key)=>key;export const useUraiLocale=()=>({locale:'en',text,props:()=>({lang:'en'})});`,
  '@/lib/i18n/JourneyOfflineNotice': `export default function JourneyOfflineNotice(){return null}`, 
  './ReplayProductControls': `export function ReplayProductControls(){return null}`, 
  './ReplayPersonPresence': `export function ReplayPersonPresence(){return null}`, 
  'next/navigation': `export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:(href)=>{window.__fixture.navigation=href}});`,
  '@/spatial/captured-reality/CapturedRealityPrivateScene': `import {useEffect} from 'react';export default function Scene({decision}){useEffect(()=>{if(decision.mode!=='gaussian-splat')return;window.__fixture.sceneMounts++;return()=>{window.__fixture.sceneDisposals++}},[decision.mode]);return <div data-scene-fixture={decision.mode} style={{minHeight:'100svh'}}>Synthetic scene-disposal boundary — no reconstructed geometry</div>}`,
}
const compiled = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import Replay from './src/app/replay/CinematicReplayClient';import Movie from './src/app/life-movie/LifeMovieClient';import Place from './src/app/spatial/captured-reality/CapturedRealityRouteClient';const Component=location.pathname==='/life-movie'?Movie:location.pathname==='/spatial/captured-reality'?Place:Replay;const root=createRoot(document.getElementById('root'));root.render(<Component/>);window.__unmount=()=>root.unmount();`, resolveDir: path.join(repo, 'urai-tier1'), loader: 'tsx' },
  bundle: true, write: false, metafile: true, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': '"urai-4dc1d"', 'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': '"urai-4dc1d.firebasestorage.app"' },
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
})
const bundle = compiled.outputFiles[0].text
const server = createServer((request, response) => {
  if (request.url === '/fixture.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle); return }
  response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/fixture.js"></script>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true, args: ['--no-sandbox'] })
const cases = [], errors = []
const memoryId = 'synthetic-receipt-memory', receiptId = 'a'.repeat(64), ownerId = 'synthetic-owner'

async function open(route = '/replay', settings = {}) {
  const mediaFixture = settings.audio ? audioFixture : fixture
  const mediaBytes = settings.audio ? audioBytes : bytes
  const context = await browser.newContext({ viewport: settings.viewport ?? (settings.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }), isMobile: !!settings.mobile, hasTouch: !!settings.mobile })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ fixture, memoryId, receiptId, ownerId, settings }) => {
    const memory = { ownerId, title: settings.title ?? 'Synthetic receipt source — not family media', occurredAt: '2026-01-01T12:00:00.000Z', summary: 'A synthetic control fixture.', emotionalState: 'calm', privacy: 'private', sourceMedia: [{ kind: settings.audio ? 'audio' : 'video', mediaReceiptId: receiptId }], star: { position: [0, 0, -4] }, replayManifest: { id: 'synthetic-manifest', version: 1, durationMs: 3000, segments: ['memory', 'emotion', 'pattern', 'return'].map((id, i) => ({ id, label: id, caption: `Synthetic ${id}`, narratorLine: 'Synthetic narration caption only', startsAtMs: i * 750, durationMs: 750 })) } }
    const kind = settings.audio ? 'audio' : 'video', mime = settings.audio ? 'audio/wav' : 'video/mp4'
    const receipt = { schemaVersion: 'urai-owned-memory-media-v1', ownerUid: ownerId, memoryId, receiptId, kind, state: 'ready', sha256: fixture.sha256, byteLength: fixture.byteLength, contentType: mime, storageGeneration: '123', consentRevision: 1, consentReceiptHash: 'b'.repeat(64), consentExpiresAt: Date.now() + 600000, deletionGeneration: 0, attemptNonce: 'synthetic-private-nonce', bucketName: 'synthetic-opaque-bucket', objectPath: 'synthetic-private-object' }
    const policy = { ownerId, version: 2, revision: 1, domains: { memory: { mode: 'granted', replayVisible: true }, location: { mode: 'granted' } }, enforcement: { state: 'fully-enforced' } }
    const base = `users/${ownerId}`
    const auth = { currentUser: { uid: ownerId, getIdToken: async () => 'synthetic-sdk-token' } }
    const f = window.__fixture = { auth, authObservers: new Set(), watchers: new Set(), allWatchers: [], holdSnapshots: settings.hold ? [`${base}/memoryMediaReceipts/${receiptId}`] : [], docs: { ['consentRecords/'+ownerId+'_memory_storage']: { uid: ownerId, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: receipt.consentReceiptHash, expiresAt: receipt.consentExpiresAt }, [base]: { accountStatus: 'active' }, [`${base}/memories/${memoryId}`]: memory, [`${base}/privacyPolicy/current`]: policy, [`${base}/privacyRuntime/exportAuthority`]: { generation: 0, pendingDeletions: {} }, [`${base}/memoryMediaReceipts/${receiptId}`]: receipt, [`${base}/privacyRuntime/location-collection`]: { enabled: true }, [`${base}/capturedRealityReplayBindings/${memoryId}`]: { ownerId, memoryId, state: 'accepted', capturedRealityAssetId: 'synthetic-accepted-place' }, [`${base}/capturedRealityAssets/synthetic-accepted-place`]: { ownerId, state: 'ready', reviewState: 'accepted', releaseState: 'private-pilot' }, [`${base}/lifeMovies/synthetic-movie`]: { id: 'synthetic-movie', version: 1, ownerId, status: 'ready', consentState: 'authorized', chapters: [{ id: 'synthetic-chapter', memoryId, order: 0, truthClass: 'RECORDED_SOURCE_TRUTH', confidence: 1, consentState: 'authorized', provenance: { sourceIds: ['synthetic-source'], objectIds: [], storyNodeIds: [], providerTaskIds: [] } }] } }, calls: [], creates: [], revocations: [], heldMedia: [], sceneMounts: 0, sceneDisposals: 0, denyAuthority: false, tamper: !!settings.tamper }
    const snapshot = p => { const value = f.docs[p]; return { exists: () => value != null, data: () => value == null ? undefined : structuredClone(value), get: k => k.split('.').reduce((v, key) => v?.[key], value) } }
    f.update = (p, value) => { f.docs[p] = value; for (const w of [...f.watchers]) if (w.p === p) w.callback(snapshot(p)) }
    f.emitAuth = user => { auth.currentUser = user; for (const callback of [...f.authObservers]) callback(user) }
    f.call = async (name, data) => {
      f.calls.push({ name, data })
      if (f.deferName === name) await new Promise(resolve => { f.releaseDeferred = resolve })
      if (f.denyAuthority) throw new Error('synthetic current authority denied')
      if (name === 'getMemoryMediaPlaybackAuthority') return { schemaVersion: 'urai-owned-memory-media-playback-v1', requiresAuthorization: true, ownerId, memoryId, receiptId, kind, contentType: mime, sha256: fixture.sha256, byteLength: fixture.byteLength, storageGeneration: '123', sourceAuthorityHash: 'c'.repeat(64), authorityHash: 'd'.repeat(64), expiresAt: Date.now() + (settings.expiry ? 1400 : 60000) }
      if (name === 'getCapturedRealityReplayEntry') return { available: true, assetId: 'synthetic-accepted-place', truthLabel: 'Synthetic SDK-boundary place entry; no world acceptance' }
      if (name === 'getCapturedRealityAsset') return { assetId: data.assetId, label: 'Synthetic SDK place', truthClass: 'spatially-reconstructable', truthLabel: 'Synthetic fixture only', sourceCount: 1 }
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
    assert.match(request.headers().authorization ?? '', /^Bearer synthetic-sdk-token$/)
    const tamper = await page.evaluate(() => window.__fixture.tamper)
    const body = url.pathname === '/streamCapturedRealityRuntime' ? Buffer.alloc(32) : tamper ? Buffer.alloc(mediaBytes.length) : mediaBytes
    await intercepted.fulfill({ status: 200, body, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'Content-Length,X-URAI-Checksum-SHA256,X-URAI-Storage-Generation', 'Content-Type': url.pathname === '/streamCapturedRealityRuntime' ? 'application/octet-stream' : settings.audio ? 'audio/wav' : 'video/mp4', 'Content-Length': String(body.length), 'X-URAI-Checksum-SHA256': url.pathname === '/streamCapturedRealityRuntime' ? 'f'.repeat(64) : mediaFixture.sha256, 'X-URAI-Storage-Generation': url.pathname === '/streamCapturedRealityRuntime' ? '321' : '123' } })
  })
  const query = route === '/spatial/captured-reality' ? `?assetId=synthetic-accepted-place${settings.standalone ? '' : `&memoryId=${memoryId}`}` : route === '/life-movie' ? `?movieId=synthetic-movie&memoryId=${memoryId}` : `?memoryId=${memoryId}`
  await page.goto(origin + route + query)
  return { page, context }
}
async function check(name, task) { await task(); cases.push({ name, passed: true }); console.log(`PASS ${name}`) }
async function playable(page, element = 'video') { await page.waitForFunction(selector => { const source = document.querySelector(selector); return source?.readyState >= 2 && Number.isFinite(source.duration) && source.duration > 0 }, element) }
async function assertDisposed(page) {
  await page.waitForFunction(() => window.__fixture.revocations.length > 0)
  const result = await page.evaluate(() => window.__fixture.revocations)
  for (const item of result) for (const media of item.media) { assert.equal(media.paused, true); assert.equal(media.src, null) }
  assert.ok(result.some(item => item.media.length > 0), 'actual mounted media was stopped before Blob revocation')
}

try {
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
    await page.evaluate(() => { const f=window.__fixture,p=`users/${f.auth.currentUser.uid}/privacyPolicy/current`; f.update(p,{...f.docs[p],domains:{...f.docs[p].domains,memory:{mode:'granted',replayVisible:false}}}) })
    await assertDisposed(page); assert.equal(await page.getByText('Synthetic receipt source — not family media', { exact: true }).count(), 0)
    await context.close()
  })
  for (const profile of [
    { name: 'desktop', viewport: { width: 1280, height: 800 } },
    { name: 'expanded-title-desktop', viewport: { width: 1280, height: 800 }, title: 'Synthetic receipt source — not family media: a retained expanded-title navigation fixture whose complete title remains available while journey controls stay reachable.' },
    { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'small-mobile', viewport: { width: 320, height: 568 }, mobile: true },
    { name: 'landscape', viewport: { width: 844, height: 390 } },
    { name: 'short-viewport', viewport: { width: 320, height: 320 } },
  ]) await check(`Long-title Replay preserves visible, pointer-reachable journey controls on ${profile.name}`, async () => {
    const { page, context } = await open('/replay', { ...profile,
      title: profile.title ?? 'Synthetic receipt source — not family media' })
    try {
      await playable(page)
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
    await page.evaluate(({field,memoryId})=>{const f=window.__fixture,base=`users/${f.auth.currentUser.uid}`,p=field==='replayVisible'?base+'/privacyPolicy/current':base+'/memories/'+memoryId; const old=f.docs[p];f.update(p,field==='replayVisible'?{...old,domains:{...old.domains,memory:{mode:'granted',replayVisible:false}}}:{...old,[field]:field==='privacy'?'hidden':true})},{field,memoryId})
    await page.locator('[data-testid="captured-reality-private-route"][data-state="suppressed"]').waitFor();assert.ok(await page.evaluate(()=>window.__fixture.sceneDisposals>0));await context.close()
  })
  await check('Standalone captured place does not acquire a Replay-memory requirement',async()=>{
    const {page,context}=await open('/spatial/captured-reality',{standalone:true});await page.locator('[data-testid="captured-reality-private-route"][data-state="ready"]').waitFor()
    await page.evaluate(()=>{const f=window.__fixture,p=`users/${f.auth.currentUser.uid}/privacyPolicy/current`;f.update(p,{...f.docs[p],domains:{...f.docs[p].domains,memory:{mode:'granted',replayVisible:false}}})})
    assert.equal(await page.locator('[data-testid="captured-reality-private-route"]').getAttribute('data-state'),'ready');await context.close()
  })
  assert.deepEqual(errors,[], 'actual bundled React consumer has no page errors')
} finally {
  await browser.close(); await new Promise(resolve=>server.close(resolve))
  const sources = [...new Set(compiled.metafile ? Object.keys(compiled.metafile.inputs) : [])]
  writeFileSync(path.join(output,'receipt.json'),JSON.stringify({schemaVersion:'urai-owned-memory-playback-browser-proof-v1',synthetic:true,privateFamilyUsed:false,worldAccepted:false,identityAccepted:false,nativePositivePrivatePlaybackAccepted:false,fixture:{sha256:fixture.sha256,byteLength:fixture.byteLength},cases,errors,sources,scope:'Actual React consumers, receipt adapter and Chromium decoding; Firebase SDK and unrelated world/assistant boundary fixtures. Captured scene renderer is a disposal sentinel, not GPU/world acceptance.',serverOnlyRevalidationIntervalMs:30000},null,2)+'\n')
}
