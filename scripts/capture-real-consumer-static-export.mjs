#!/usr/bin/env node
// Actual source-controlled Next.js export; never simulated media or fixture bytes.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { verifyRealConsumerXrExport } from './lib/real-consumer-xr-export.mjs'
import { sourcePrFromRunner } from './lib/real-consumer-source-pr.mjs'

const exact = process.env.URAI_EXACT_HEAD || ''
const src = path.resolve('urai-tier1/out')
const manifestFile = path.resolve('artifacts/consumer-export/real-static-manifest.json')
const required = ['index.html','home/index.html','ascent/index.html','life-map/index.html',
  'focus/index.html','replay/index.html','unwind/index.html','login/index.html',
  'privacy-controls/index.html','privacy-policy/index.html','support/index.html',
  'api/system/deploy-proof','static-launch-boundary.json']
const unsafe = /(?:^|\/)(?:\.env(?:\..+)?|\.git|node_modules|id_rsa|service-account[^/]*\.json|firebase-adminsdk[^/]*\.json|[^/]+\.(?:pem|p12|pfx|key)|family-originals|private-captures)(?:\/|$)/i
const fail = x => {throw new Error('Real UrAi static export rejected: '+x)}
const git = (...args) => execFileSync('git',args,{encoding:'utf8'}).trim()
if (!/^[a-f0-9]{40}$/.test(exact) || git('rev-parse','HEAD') !== exact) fail('expected source SHA mismatch')
if (git('status','--porcelain','--untracked-files=no')) fail('tracked source modified during build')
const treeSha = git('rev-parse','HEAD^{tree}')
const stat = fs.lstatSync(src)
if (!stat.isDirectory() || stat.isSymbolicLink()) fail('nonphysical export root')
const files = [], names = new Set()
let totalBytes = 0
function walk(dir,prefix='') {
  for (const item of fs.readdirSync(dir).sort()) {
    const name = prefix ? prefix+'/'+item : item
    const abs = path.join(dir,item), entry = fs.lstatSync(abs)
    if (entry.isSymbolicLink() || unsafe.test(name)) fail('symlink/sensitive path: '+name)
    if (entry.isDirectory()) {walk(abs,name);continue}
    if (!entry.isFile() || entry.size > 128*1024*1024) fail('unsafe file type/size: '+name)
    if (names.has(name.toLowerCase())) fail('case-insensitive path conflict: '+name)
    names.add(name.toLowerCase())
    const buf = fs.readFileSync(abs)
    totalBytes += buf.length
    if (totalBytes > 750*1024*1024 || files.length >= 40000) fail('size/count limit')
    files.push({path:name,bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex')})
  }
}
walk(src)
for(const p of required) if(!files.some(f=>f.path===p)) fail('missing real app route: '+p)
if(!files.some(f=>f.path.startsWith('_next/static/') && f.path.endsWith('.js'))) fail('missing compiled client JavaScript')
function readProof(name){const p=path.join(src,name),s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink())fail('invalid proof file: '+name);return JSON.parse(fs.readFileSync(p,'utf8'))}
const proof=readProof('api/system/deploy-proof'), boundary=readProof('static-launch-boundary.json')
if(proof.repository!=='LifeLoggerAI/urai-spatial'||proof.service!=='urai-spatial-deploy-proof'||
  proof.deploymentFreshness?.commitSha!==exact || proof.deploymentFreshness?.commitShaKnown!==true)fail('compiled source identity not exact')
if(boundary.releaseClassification!=='NO-GO'||boundary.sourceSha!==exact||
  boundary.providerActivation!==false||boundary.deviceAcceptance!==false||
  !Array.isArray(boundary.routes)||boundary.routes.some(x=>typeof x.enabled!=='boolean'))fail('unsafe static launch authority')
const xrExport=verifyRealConsumerXrExport({
  boundary,files,
  readHtml:name=>fs.readFileSync(path.join(src,name),'utf8'),
})
// Do not permit any other disabled route to expose a static entry point.
for(const x of boundary.routes)if(!x.enabled && !['/xr','/spatial/ar-vr'].includes(x.route)){
  const p=String(x.route||'').replace(/^\/+/,'')
  if(!p||p.includes('..'))fail('invalid protected route')
  if(files.some(f=>f.path===p+'/index.html'||f.path===p+'.html'))fail('disabled protected route exposed: '+p)
}
const manifest={schemaVersion:'urai-real-spatial-static-export-1',
  repository:'LifeLoggerAI/urai-spatial',sourceSha:exact,sourceTreeSha:treeSha,
  sourcePullRequest:sourcePrFromRunner(),scope:'real-compiled-static-consumer-not-deployed',
  fileCount:files.length,totalBytes,files,
  authenticatedServiceParityVerified:false,privateStagingDeployed:false,
  finalAssetsAdmitted:false,independentReviewApproved:false,productionAuthorized:false,
  xrExport}
fs.mkdirSync(path.dirname(manifestFile),{recursive:true})
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({result:'REAL_BUILD_EXPORTED_AND_HASHED',sourceSha:exact,sourceTreeSha:treeSha,fileCount:files.length,totalBytes,manifestFile},null,2))
