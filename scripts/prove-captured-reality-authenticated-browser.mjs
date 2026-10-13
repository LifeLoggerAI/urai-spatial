/**
 * Isolated Firebase-to-Chromium Captured Reality proof.
 * Mounts the ACTUAL UrAi CapturedRealityRouteClient + R3F Gaussian/GLB scene.
 * Only Next's navigation provider is substituted because the production
 * component is bundled into a local proof shell, not a second renderer.
 * Auth, Firestore listeners, Functions callables and both binary streams all
 * use the unmodified Firebase browser SDK against four running emulators.
 * No intercepted or fulfilled HTTP responses are permitted.
 * All identities and geometry are synthetic. NOT release/art certification.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { build } = require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild'))
const { chromium } = require('playwright')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, 'artifacts/captured-reality-authenticated-browser')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const project = 'demo-urai-hybrid-proof'
const exactHead = process.env.URAI_EXACT_HEAD
assert.match(exactHead ?? '', /^[a-f0-9]{40}$/, 'Exact source head required')
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199')
assert.equal(process.env.FUNCTIONS_EMULATOR, 'true')

const entry = [
  "import React,{useEffect,useState} from 'react'",
  "import * as THREE from 'three'",
  "import {createRoot} from 'react-dom/client'",
  "import {getAuth,connectAuthEmulator,signInWithEmailAndPassword} from 'firebase/auth'",
  "import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore'",
  "import {connectFunctionsEmulator} from 'firebase/functions'",
  "import {app,functions} from './src/lib/firebase/client'",
  "import CapturedRealityRouteClient from './src/app/spatial/captured-reality/CapturedRealityRouteClient'",
  "const auth=getAuth(app)",
  "connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})",
  "connectFirestoreEmulator(getFirestore(app),'127.0.0.1',8080)",
  "connectFunctionsEmulator(functions,'127.0.0.1',5001)",
  // Observe actual Three.js disposal events without altering the production renderer.
  "const disposal={geometry:0,material:0,texture:0}",
  "for(const [kind,proto] of [['geometry',THREE.BufferGeometry.prototype],['material',THREE.Material.prototype],['texture',THREE.Texture.prototype]]){const original=proto.dispose;proto.dispose=function(...args){disposal[kind]++;return original.apply(this,args)}}",
  "window.__uraiProofDisposal=disposal",
  "window.__uraiProofOwnerToken=async()=>{const current=getAuth(app).currentUser;if(!current)throw new Error('PROOF_OWNER_NOT_AUTHENTICATED');return current.getIdToken()}",
  "const fixture=window.__uraiProofIdentity",
  "function ProofShell(){",
  " const [status,setStatus]=useState('authenticating')",
  " useEffect(()=>{let alive=true;",
  "  signInWithEmailAndPassword(auth,fixture.email,fixture.password).then(result=>{",
  "   if(result.user.uid!==fixture.uid)throw new Error('PROOF_IDENTITY_MISMATCH')",
  "   if(alive)setStatus('signed-in')",
  "  }).catch(()=>{if(alive)setStatus('auth-error')})",
  "  return()=>{alive=false}",
  " },[])",
  " return <div data-urai-proof-auth={status}>{status==='signed-in'?<CapturedRealityRouteClient/>:<main role='status'>Checking isolated owner identity</main>}</div>",
  "}",
  "createRoot(document.getElementById('root')).render(<ProofShell/>)",
].join('\n')
const bundle = (await build({
  stdin: { contents: entry, resolveDir: path.join(root, 'urai-tier1'), loader: 'tsx' },
  write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  logLevel: 'error',
  // Next replaces browser process.env references during its production build.
  // This isolated esbuild route proof needs the same public, test-only shim.
  // Never inject a real Node process, production environment, or credentials.
  banner: {js: 'var process = { env: { NODE_ENV: "test" } };'},
  
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': '"demo-api-key"',
    'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': '"demo-urai-hybrid-proof.firebaseapp.com"',
    'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': '"demo-urai-hybrid-proof"',
    'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': '"demo-urai-hybrid-proof.appspot.com"',
    'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': '"1:123456789:web:emulatorproof"',
  },
  plugins: [{
    name: 'actual-urai-source-and-next-navigation-provider',
    setup(plugin) {
      plugin.onResolve({filter:/^next\/navigation$/},()=>({path:'next-navigation-proof',namespace:'urai-test-navigation'}))
      plugin.onLoad({filter:/.*/,namespace:'urai-test-navigation'},()=>({
        contents:"export const useRouter=()=>({push:(href)=>window.location.assign(href)});export const useSearchParams=()=>new URLSearchParams(window.location.search);",
        loader:'js',
      }))
      plugin.onResolve({filter:/^@\//},args=>{
        const base=path.join(root,'urai-tier1/src',args.path.slice(2))
        const resolved=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(existsSync)
        if(!resolved) throw new Error('Missing actual app module: '+args.path)
        return {path:resolved}
      })
    },
  }],
})).outputFiles[0].text

const server = createServer((req,res)=>{
  if (req.url === '/bundle.js') {
    res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'})
    res.end(bundle);return
  }
  if (req.url?.startsWith('/?')) {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'})
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#05070b"><div id="root"></div><script src="/bundle.js"></script></body></html>')
    return
  }
  res.writeHead(404,{'Cache-Control':'no-store'});res.end('Not found')
})
const browserProfiles = [
  {name:'desktop',width:1280,height:800,mobile:false,reduced:false},
  {name:'mobile-reduced',width:390,height:844,mobile:true,reduced:true},
]
const receipt = {
  schema:'urai-real-firebase-browser-hybrid-1', exactHead, project,
  classification:'ISOLATED_SYNTHETIC_BROWSER_PROOF_NOT_RECONSTRUCTION_OR_GOLD_MASTER',
  realFirebaseAuth:true,realFunctionsAndStorage:true,interceptedResponses:false,
  usesProductionCapturedRealityRoute:true,profiles:[],errors:[],
  identityAndSecretsRedacted:true,physicalGpuCertified:false,
}
const endpointNames=['getCapturedRealityAsset','getCapturedRealityRuntimeUrl','streamCapturedRealityRuntime','getCapturedRealityMeshUrl','streamCapturedRealityMesh']
let browser
const sessions=[]
await mkdir(destination,{recursive:true})
try {
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve))
  browser = await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox']})
  const base = 'http://127.0.0.1:4173/?assetId='
  for(const profile of browserProfiles) {
    const context=await browser.newContext({
      viewport:{width:profile.width,height:profile.height},isMobile:profile.mobile,
      hasTouch:profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference',
      ...(profile.mobile?{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Mobile Safari/537.36'}:{}),
    })
    const page=await context.newPage(),errors=[],requests=[],responses=[]
    // Keep signed synthetic fixture URLs only in runner memory, not receipts.
    const privateStreamUrls=new Map()
    sessions.push({context,page,profile,privateStreamUrls})
    page.on('pageerror',error=>errors.push(String(error.stack||error.message).slice(0,1000)))
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text().slice(0,400))})
    page.on('request',request=>{
      const url=new URL(request.url())
      const name=endpointNames.find(n=>url.pathname.endsWith('/'+n))
      if(name)requests.push({name,method:request.method(),origin:url.origin})
    })
    page.on('response',response=>{
      const url=new URL(response.url())
      const name=endpointNames.find(n=>url.pathname.endsWith('/'+n))
      if(name)responses.push({name,status:response.status()})
      if(response.status()===200 && (name==='streamCapturedRealityRuntime'||name==='streamCapturedRealityMesh')
        && response.request().method()==='GET') privateStreamUrls.set(name,response.url())
    })
    const record={profile:profile.name,passed:false,auth:false,canvasCount:0}
    receipt.profiles.push(record)
    await page.addInitScript(value=>{window.__uraiProofIdentity=value},
      {uid:process.env.URAI_OWNER_UID,email:process.env.URAI_OWNER_EMAIL,password:process.env.URAI_OWNER_PASSWORD})
    await page.goto(base+encodeURIComponent(process.env.URAI_ASSET_ID)+'&proof=1',{waitUntil:'domcontentloaded',timeout:60000})
    try {
      await page.locator('[data-urai-proof-auth="signed-in"]').waitFor({timeout:45000})
    } catch (error) {
      // A blank proof screen is not an authentication verdict. Preserve only
      // synthetic-test bootstrap diagnostics so actual browser defects are actionable.
      const bootstrap = {
        status:await page.locator('[data-urai-proof-auth]').first()
          .getAttribute('data-urai-proof-auth').catch(()=>null),
        rootCount:await page.locator('#root').count(),
        bundleScriptCount:await page.locator('script[src="/bundle.js"]').count(),
        pageErrors:errors.slice(0,8),
      }
      record.bootstrap=bootstrap
      throw new Error('Authenticated browser proof did not reach signed-in state: '
        +JSON.stringify(bootstrap)+'; '+String(error).slice(0,120))
    }
    record.auth=true
    await page.locator('[data-captured-reality-hybrid-draw-submitted="true"]').waitFor({timeout:120000})
    const scene=await page.locator('section[aria-label="Private captured place"]').evaluate(node=>({
      mode:node.getAttribute('data-captured-reality-mode'),
      splat:node.getAttribute('data-captured-reality-draw-submitted'),
      mesh:node.getAttribute('data-captured-reality-hybrid-draw-submitted'),
      state:node.getAttribute('data-captured-reality-render-state'),
      canvasCount:node.querySelectorAll('canvas').length,
      reducedMotion:node.getAttribute('data-captured-reality-reduced-motion'),
      truthLabel:node.querySelector('[aria-live]')?.textContent?.slice(0,100),
      optionalGuidance:(()=>{
        const guidance=[...node.querySelectorAll('span')].find(candidate=>candidate.textContent?.includes('Captured Reality is optional.'))
        if(!guidance)return null
        const rect=guidance.getBoundingClientRect(),style=getComputedStyle(guidance)
        return {width:rect.width,height:rect.height,position:style.position,overflow:style.overflow}
      })(),
    }))
    assert.equal(scene.mode,'gaussian-splat')
    assert.equal(scene.splat,'true')
    assert.equal(scene.mesh,'true')
    assert.equal(scene.canvasCount,1)
    assert.equal(scene.reducedMotion,String(profile.reduced))
    assert.ok(scene.truthLabel?.includes('not an accepted memory world'))
    assert.equal(scene.optionalGuidance?.position,'absolute')
    assert.equal(scene.optionalGuidance?.overflow,'hidden')
    assert.ok(scene.optionalGuidance.width<=1&&scene.optionalGuidance.height<=1,
      profile.name+': screen-reader escape guidance painted into the captured-place viewport')
    for(const name of endpointNames)assert.ok(responses.some(x=>x.name===name&&x.status===200),
      profile.name+': actual Firebase endpoint not observed: '+name)
    assert.deepEqual(errors,[],profile.name+' browser console errors')
    record.scene=scene
    record.disposalBefore=await page.evaluate(()=>({...window.__uraiProofDisposal}))
    record.requests=endpointNames.map(name=>({name,
      requestCount:requests.filter(x=>x.name===name).length,
      successfulResponses:responses.filter(x=>x.name===name&&x.status===200).length}))
    const before=await page.screenshot({path:path.join(destination,profile.name+'-authorized.png'),animations:'disabled'})
    assert.ok(before.length>5000,'Real authorized screenshot is unexpectedly empty')
    record.before={name:profile.name+'-authorized.png',sha256:sha256(before),bytes:before.length}
    record.canvasCount=1
    record.passed=true
  }
  // Mutate the ACTUAL emulator Firestore authority after both browser scenes
  // have rendered. All React listeners must fail closed and unmount the Canvas.
  // This standalone test script is a separate Node process from Functions.
  // Initialize only its isolated demo-project Admin client; do not use
  // production credentials or change any application authorization path.
  const {getApps, initializeApp} = await import('firebase-admin/app')
  const {getFirestore} = await import('firebase-admin/firestore')
  const emulatorAdmin = getApps().find(instance=>instance.name==='urai-auth-browser-proof')
    ?? initializeApp({projectId:project},'urai-auth-browser-proof')
  const db=getFirestore(emulatorAdmin)
  await db.doc('users/'+process.env.URAI_OWNER_UID+'/privacyPolicy/current')
    .update({'domains.location.mode':'denied'})
  receipt.revocation={mutation:'location consent denied in Firestore emulator',
    beforeCount:sessions.length,afterCount:0}
  for(const {page,profile,privateStreamUrls} of sessions){
    const record=receipt.profiles.find(x=>x.profile===profile.name)
    await page.locator('[data-captured-reality-mode="suppressed"]').waitFor({timeout:25000})
    await page.waitForFunction(()=>document.querySelectorAll('canvas').length===0,null,{timeout:15000})
    assert.equal(await page.locator('canvas').count(),0,'Revoked private geometry still mounted')
    // Observe the existing scene's real GPU-resource disposal calls after unmount.
    await page.waitForFunction(before=>{
      const after=window.__uraiProofDisposal
      return after.geometry>before.geometry && after.material>before.material
        && after.texture>before.texture
    },record.disposalBefore,{timeout:15000})
    record.disposalAfter=await page.evaluate(()=>({...window.__uraiProofDisposal}))
    assert.ok(record.disposalAfter.geometry>record.disposalBefore.geometry,'Geometry.dispose not called')
    assert.ok(record.disposalAfter.material>record.disposalBefore.material,'Material.dispose not called')
    assert.ok(record.disposalAfter.texture>record.disposalBefore.texture,'Texture.dispose not called')
    assert.equal(privateStreamUrls.size,2,'Both prior private streams must have loaded')
    const staleAccess=await page.evaluate(async links=>{
      const token=await window.__uraiProofOwnerToken()
      return Promise.all(links.map(async ({name,url})=>({
        name,status:(await fetch(url,{method:'GET',cache:'no-store',redirect:'error',
          credentials:'omit',headers:{Authorization:'Bearer '+token}})).status,
      })))
    },[...privateStreamUrls.entries()].map(([name,url])=>({name,url})))
    assert.ok(staleAccess.every(x=>x.status===403||x.status===409),
      'A stale private stream was accepted after consent withdrawal')
    record.revokedStreamStatuses=staleAccess
    const after=await page.screenshot({path:path.join(destination,profile.name+'-revoked.png'),animations:'disabled'})
    assert.ok(after.length>5000,'Missing genuine post-revocation screenshot')
    assert.notEqual(sha256(after),record.before.sha256,'Private-world pixels did not change')
    record.revocation={name:profile.name+'-revoked.png',sha256:sha256(after),canvasCount:0,privateMode:'suppressed'}
    // Reloading cannot resurrect a pre-revocation private descriptor from cache.
    await page.reload({waitUntil:'domcontentloaded',timeout:60000})
    await page.locator('[data-urai-proof-auth="signed-in"]').waitFor({timeout:45000})
    await page.locator('[data-captured-reality-mode="suppressed"]').waitFor({timeout:25000})
    assert.equal(await page.locator('canvas').count(),0,'Revoked world reloaded from cache')
    record.unauthorizedReloadDenied=true
  }
  receipt.revocation.afterCount=receipt.profiles.filter(x=>x.revocation?.canvasCount===0).length
  receipt.passed=receipt.profiles.every(x=>x.passed&&x.unauthorizedReloadDenied)
    && receipt.revocation.afterCount===sessions.length
} catch(error) {
  receipt.passed=false
  receipt.errors.push(String(error?.stack??error).slice(0,2400))
  for(const {page,profile} of sessions){
    try{await page.screenshot({path:path.join(destination,profile.name+'-failure.png'),timeout:15000})}catch{}
  }
} finally {
  for(const {context} of sessions)try{await context.close()}catch{}
  if(browser)await browser.close()
  await new Promise(resolve=>server.close(resolve))
  await writeFile(path.join(destination,'receipt.json'),JSON.stringify(receipt,null,2)+'\n')
}
assert.equal(receipt.passed,true,JSON.stringify(receipt,null,2))
console.log(JSON.stringify({passed:receipt.passed,profiles:receipt.profiles,revocation:receipt.revocation},null,2))
