import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
const verifier = fileURLToPath(new URL('../verify-launch-critical-assets.mjs', import.meta.url))
const bytes = Buffer.from('governed-home-test')
const sha = crypto.createHash('sha256').update(bytes).digest('hex')
function check(change = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-asset-fence-'))
  function put(p, data) {
    const f=path.join(root,p); fs.mkdirSync(path.dirname(f),{recursive:true})
    fs.writeFileSync(f,Buffer.isBuffer(data)?data:JSON.stringify(data))
  }
  const id='home-entry-chamber-v1', fixedPath='public/home.glb'
  const m={id,fixedPath,kind:'model',source:'source',license:'license',fallback:'fallback',releaseState:change.candidate?'pending-final-review':'production-ready'}
  const receipt={id,fixedPath,bytes:bytes.length,sha256:sha,releaseState:'production-ready',compressionStatus:'meshopt',source:m.source,license:m.license,visualAcceptance:{accepted:true},deploymentAuthorized:true}
  const decision={canonicalPath:fixedPath,sha256:sha,bytes:bytes.length,receiptPath:'operations/assets/production-receipts/'+id+'.json',promote:true,humanReviewApproved:true,visualProofVerified:true,licenseApproved:true,fallback:m.fallback,producer:'forge',reviewer:'reviewer'}
  put(fixedPath,bytes)
  put('operations/assets/launch-critical-assets.json',{manifestId:'test',receiptRoot:'operations/assets/generated-receipts',assets:[m]})
  if (!change.noProduction) put('operations/assets/production-receipts/'+id+'.json',{...receipt,...change.receipt})
  if (!change.noDecision) put('operations/assets/promotion-decisions/'+id+'.json',{...decision,...change.decision})
  put('operations/assets/generated-receipts/'+id+'.json',{...receipt,bytes:change.candidate?bytes.length:999,sha256:change.candidate?sha:'old',releaseState:'candidate-not-production-ready'})
  try {
    const r=spawnSync(process.execPath,[verifier],{cwd:root,encoding:'utf8'})
    assert.equal(r.stderr,'')
    return {code:r.status,out:JSON.parse(r.stdout)}
  } finally {fs.rmSync(root,{recursive:true,force:true})}
}
test('valid promoted asset ignores historical stale generated candidate receipt',()=>{
 const r=check();assert.equal(r.code,0);assert.equal(r.out.ok,true)
 assert.match(r.out.results[0].receiptPath,/production-receipts/)
})
test('production receipt altered checksum must fail',()=>{
 const r=check({receipt:{sha256:'invalid'}});assert.equal(r.code,1)
 assert.match(r.out.errors.join(' '),/receipt SHA-256/)
})
test('missing production receipt never falls back to generated candidate',()=>{
 const r=check({noProduction:true});assert.equal(r.code,1)
 assert.match(r.out.errors.join(' '),/missing receipt/)
})
test('mismatched promotion decision cannot authorize asset',()=>{
 const r=check({decision:{bytes:900}});assert.equal(r.code,1)
 assert.match(r.out.errors.join(' '),/promotion decision/)
})
test('missing independent approval decision cannot authorize asset',()=>{
 const r=check({noDecision:true});assert.equal(r.code,1)
 assert.match(r.out.errors.join(' '),/missing governed promotion decision/)
})
test('production-ready manifest requires production-ready receipt',()=>{
 const r=check({receipt:{releaseState:'candidate-not-production-ready'}});assert.equal(r.code,1)
 assert.match(r.out.errors.join(' '),/production-ready manifest/)
})
test('candidate assets continue to use generated candidate receipts',()=>{
 const r=check({candidate:true});assert.equal(r.code,0)
 assert.match(r.out.results[0].receiptPath,/generated-receipts/)
})
