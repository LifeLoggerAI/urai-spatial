/** Actual production Gaussian renderer + GLTFLoader in a shared WebGL Canvas.
 * ALL binary sources below are synthetic test fixtures. No Firebase owner proof,
 * real memory claim, physical GPU certification, or asset admission is implied.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require=createRequire(new URL('../urai-tier1/package.json',import.meta.url))
const { build }=require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild'))
const { chromium }=require('playwright')
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dest=path.join(root,'artifacts/captured-reality-hybrid-browser')
const head=process.env.URAI_EXACT_HEAD
assert.match(head??'',/^[a-f0-9]{40}$/)
await mkdir(dest,{recursive:true})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
const splat=Buffer.alloc(96*32)
for(let i=0;i<96;i++){
  const offset=i*32
  splat.writeFloatLE(-.9+(i%12)*.07,offset)
  splat.writeFloatLE(-.3+Math.floor(i/12)*.085,offset+4)
  splat.writeFloatLE(0,offset+8)
  for(let j=0;j<3;j++)splat.writeFloatLE(.105,offset+12+4*j)
  splat[offset+24]=255;splat[offset+25]=175;splat[offset+26]=65;splat[offset+27]=255
  splat[offset+28]=255;splat[offset+29]=128;splat[offset+30]=128;splat[offset+31]=128
}
function buildGlb(){
  const xyz=new Float32Array([.25,.2,.1,1.25,.2,.1,1.25,1.25,.1,.25,.2,.1,1.25,1.25,.1,.25,1.25,.1])
  const binary=Buffer.from(xyz.buffer)
  const gltf={asset:{version:'2.0',generator:'UrAi synthetic technical proof'},buffers:[{byteLength:binary.length}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:binary.length,target:34962}],
    accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3',min:[.25,.2,.1],max:[1.25,1.25,.1]}],
    materials:[{emissiveFactor:[0,.95,.45],doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.2,.3,.25,1],roughnessFactor:1,metallicFactor:0}}],
    meshes:[{primitives:[{attributes:{POSITION:0},material:0,mode:4}]}],
    nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0}
  const data=Buffer.from(JSON.stringify(gltf))
  const json=Buffer.alloc(Math.ceil(data.length/4)*4,32);data.copy(json)
  const result=Buffer.alloc(20+json.length+8+binary.length)
  result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8)
  result.writeUInt32LE(json.length,12);result.writeUInt32LE(0x4e4f534a,16);json.copy(result,20)
  result.writeUInt32LE(binary.length,20+json.length);result.writeUInt32LE(0x004e4942,24+json.length)
  binary.copy(result,28+json.length)
  return result
}
const mesh=buildGlb(),splatSha=hash(splat),meshSha=hash(mesh)
const host='https://us-central1-urai-4dc1d.cloudfunctions.net'
const assetId='synthetic-hybrid-world'
const pathQuery='assetId='+assetId+'&accessMode=proof&deviceTier=desktop&deliveryId='+'f'.repeat(64)
const splatUrl=host+'/streamCapturedRealityRuntime?'+pathQuery
const descriptor={available:true,assetId,accessMode:'proof',deviceTier:'desktop',
  requiresAuthorization:true,url:host+'/streamCapturedRealityMesh?'+pathQuery,
  expiresAt:new Date(Date.now()+8*60_000).toISOString(),
  meshSha256:meshSha,meshByteLength:mesh.length,meshStorageGeneration:'123',
  splatSha256:splatSha,registration:{schemaVersion:'urai-hybrid-registration-1',
    splatSha256:splatSha,meshSha256:meshSha,splatToWorld:identity,meshToWorld:identity,
    sourceFrame:'right-handed-y-up',admission:'technical-proof',alignmentReviewed:true,metricScaleReviewed:false}}
const entry=[
  "import React,{useEffect,useMemo,useState} from 'react'",
  "import {createRoot} from 'react-dom/client'",
  "import Scene from './src/spatial/captured-reality/CapturedRealityPrivateScene'",
  "import {privateMeshDescriptorValid,fetchPrivateHybridMesh} from './src/spatial/captured-reality/capturedRealityHybridDelivery'",
  "const f=window.__uraiHybridFixture",
  "function App(){",
  " const [mesh,setMesh]=useState(null);const [active,setActive]=useState(true);const [error,setError]=useState('')",
  " const authority=useMemo(()=>({requestHeaders:async()=>({Authorization:'Bearer '+f.ownerToken}),expectedByteLength:f.splatLength,expectedSha256:f.splatSha}),[])",
  " useEffect(()=>{const ac=new AbortController();",
  " const expected={assetId:f.descriptor.assetId,accessMode:'proof',deviceTier:f.descriptor.deviceTier,projectId:'urai-4dc1d',splatSha256:f.splatSha}",
  " if(!privateMeshDescriptorValid(f.descriptor,expected)){setError('INVALID_DESCRIPTOR');return}",
  " fetchPrivateHybridMesh(f.descriptor,authority.requestHeaders,ac.signal).then(result=>{if(!ac.signal.aborted)setMesh(result)}).catch(e=>{if(!ac.signal.aborted)setError(e.message)})",
  " return()=>{ac.abort();setMesh(null)}",
  " },[])",
  " const decision={mode:'gaussian-splat',assetUrl:f.splatUrl,truthLabel:'SYNTHETIC TECHNICAL HYBRID - NOT A PERSONAL MEMORY',autobiographical:false,reasons:[],fallbackMeshArtifactId:null,collisionArtifactId:null,allowedSourceIds:[]}",
  " return active?<div data-mesh-transport-error={error}><Scene decision={decision} authority={authority} reducedMotion={f.reducedMotion} hybridMesh={mesh} activeSplatSha256={f.splatSha} hybridAccessMode='proof' onExit={()=>{setMesh(null);setActive(false)}} /></div>:<main data-hybrid-exit-complete='true'>Private resources released</main>",
  "}",
  "createRoot(document.getElementById('root')).render(<App />)",
].join('\n')
const bundle=(await build({stdin:{contents:entry,resolveDir:path.join(root,'urai-tier1'),loader:'tsx'},
  bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',
  define:{'process.env.NODE_ENV':'"test"'},logLevel:'error',
  plugins:[{name:'actual-source-alias',setup(plugin){
    plugin.onResolve({filter:/^@\//},args=>{
      const base=path.join(root,'urai-tier1/src',args.path.slice(2))
      const resolved=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(existsSync)
      if(!resolved)throw new Error('Missing real import: '+args.path)
      return {path:resolved}
    })
  }}]
})).outputFiles[0].text
const server=createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle);return}
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script src="/bundle.js"></script></body></html>')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox']})
const receipt={schema:'urai-hybrid-real-component-browser-proof-1',exactHead:head,
  classification:'SYNTHETIC_TWO_LAYER_SOFTWARE_WEBGL_TECHNICAL_PROOF_NOT_AUTHENTICATED_PRODUCTION_OR_ART_ACCEPTANCE',
  splatSha256:splatSha,meshSha256:meshSha,personalSourceBytes:false,
  firebaseEmulatorAuthentication:false,physicalGpuCertified:false,
  results:[],errors:[]}
try{
 for(const profile of [{name:'desktop',viewport:{width:1280,height:800},mobile:false,reduced:false},
   {name:'mobile-reduced',viewport:{width:390,height:844},mobile:true,reduced:true}]){
  const context=await browser.newContext({viewport:profile.viewport,isMobile:profile.mobile,hasTouch:profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference'})
  const page=await context.newPage(),errors=[],network=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text().slice(0,300))})
  await page.addInitScript(data=>{window.__uraiHybridFixture=data},{
    descriptor,splatUrl,splatSha,splatLength:splat.length,ownerToken:'synthetic-owner-only',reducedMotion:profile.reduced})
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin===origin)return route.continue()
    const splatRequest=url.pathname==='/streamCapturedRealityRuntime'
    const meshRequest=url.pathname==='/streamCapturedRealityMesh'
    if(url.hostname!=='us-central1-urai-4dc1d.cloudfunctions.net'||(!splatRequest&&!meshRequest)){
      network.push('Unexpected external request '+url.pathname);return route.abort()
    }
    const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'GET,OPTIONS',
      'access-control-allow-headers':'Authorization','cache-control':'private,no-store'}
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers})
    if(request.method()!=='GET'||request.headers()['authorization']!=='Bearer synthetic-owner-only'){
      network.push('Rejected unknown token or method');return route.fulfill({status:403,body:'Denied',headers})
    }
    const body=splatRequest?splat:mesh
    await route.fulfill({status:200,body,headers:{...headers,
      'access-control-expose-headers':'Content-Length,Content-Type,X-URAI-Checksum-SHA256,X-URAI-Storage-Generation',
      'content-type':splatRequest?'application/octet-stream':'model/gltf-binary',
      'content-length':String(body.length),
      'x-urai-checksum-sha256':splatRequest?splatSha:meshSha,
      'x-urai-storage-generation':'123'}})
  })
  const record={profile:profile.name,width:profile.viewport.width,height:profile.viewport.height,passed:false}
  try{
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000})
    await page.locator('[data-captured-reality-hybrid-draw-submitted="true"]').waitFor({timeout:90000})
    const info=await page.locator('section[aria-label="Private captured place"]').evaluate(el=>({
      gaussian:el.getAttribute('data-captured-reality-draw-submitted'),
      hybrid:el.getAttribute('data-captured-reality-hybrid-draw-submitted'),
      renderState:el.getAttribute('data-captured-reality-render-state'),
      truthLabel:el.querySelector('[aria-live]')?.textContent,
      canvases:el.querySelectorAll('canvas').length,
    }))
    assert.equal(info.gaussian,'true')
    assert.equal(info.hybrid,'true')
    assert.equal(info.canvases,1,'Gaussian and GLB must share one actual Canvas')
    assert.ok(info.truthLabel.includes('NOT A PERSONAL MEMORY'))
    assert.equal(await page.locator('[data-mesh-transport-error]').getAttribute('data-mesh-transport-error'),'')
    assert.deepEqual(network,[])
    assert.deepEqual(errors,[])
    record.proof=info
    record.screenshot=profile.name+'.png'
    const png=await page.screenshot({path:path.join(dest,record.screenshot),animations:'disabled'})
    assert.ok(png.length>5000)
    record.screenshotSha256=hash(png)
    await page.getByRole('button',{name:'Exit captured place'}).click()
    await page.locator('[data-hybrid-exit-complete="true"]').waitFor({timeout:15000})
    assert.equal(await page.locator('canvas').count(),0)
    record.privateSceneDisposedOnExit=true
    record.passed=true
  }catch(error){
    record.error=String(error?.stack||error).slice(0,2300)
    record.browserErrors=errors.slice(0,12);record.networkErrors=network.slice(0,12)
    receipt.errors.push({profile:profile.name,error:record.error})
    try{record.failureScreenshot=profile.name+'-failure.png'
      await page.screenshot({path:path.join(dest,record.failureScreenshot),timeout:15000})}catch{}
  }finally{receipt.results.push(record);await context.close()}
 }
}finally{
 await browser.close()
 await new Promise(resolve=>server.close(resolve))
 await writeFile(path.join(dest,'receipt.json'),JSON.stringify(receipt,null,2)+'\n')
}
assert.equal(receipt.errors.length,0,JSON.stringify(receipt.errors,null,2))
console.log(JSON.stringify({head,classification:receipt.classification,results:receipt.results},null,2))
