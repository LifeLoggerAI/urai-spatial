import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/genesis-ascent-patched-review-capture.mjs')
const revised='07892c7d549f8eafe160184315c4db3f7bfcb624'
const capture=(...args)=>spawnSync(process.execPath,[base,...args],{encoding:'utf8',timeout:15000})

test('review recorder describes its private-only input contract without launching browser',()=>{
 const r=capture('--help')
 assert.equal(r.status,0)
 assert.match(r.stdout,/--source-sha/)
 assert.match(r.stdout,/--output/)
 assert.match(r.stdout,/127\.0\.0\.1/)
})

test('network-hosted browser capture is rejected before checkout or runtime',()=>{
 const r=capture('--url','https://outside.example/home/?demo=1','--source-sha',revised,'--output','/PRIVATE/test')
 assert.equal(r.status,2)
 const output=JSON.parse(r.stdout)
 assert.match(output.errors.join(' '),/ONLY_LOCAL_DISCLOSED_FIXTURE_HOME_ALLOWED/)
 assert.equal(output.completed,false)
})

test('old compiled application cannot be relabelled patched capture',()=>{
 const r=capture('--url','http://127.0.0.1:4173/home/?demo=1','--source-sha','94c8a2cf68a436a0c49e80b3a09578935df12d48','--output','/PRIVATE/test')
 assert.equal(r.status,2)
 const output=JSON.parse(r.stdout)
 assert.match(output.errors.join(' '),/NEW_CORRECTED_BUILD_REVISION_REQUIRED/)
})


test('patched capture cannot mark completion until decoded pixel preflight succeeds',()=>{
 const source=readFileSync(base,'utf8')
 assert.match(source,/genesis-ascent-pixel-gate\.py/)
 assert.match(source,/PIXEL_AND_CAMERA_PREFLIGHT_PASSED_HUMAN_REVIEW_REQUIRED/)
 assert.match(source,/receipt\.humanVisualApproval=false/)
 assert.ok(source.indexOf('receipt.pixelPreflight=')<source.indexOf('receipt.completed=true'))
})


test('Windows HOLD review supports an explicit private venv interpreter without shell quoting',()=>{
  const source=readFileSync(base,'utf8')
  assert.match(source,/URAI_GENESIS_PYTHON/)
  assert.match(source,/exec\(preflightPython,\[/)
  assert.doesNotMatch(source,/exec\('python3',\[/)
  assert.match(source,/PREFLIGHT_PYTHON_MUST_BE_ABSOLUTE_PATH/)
})

test('authorized local installed Chrome can be selected without bypassing browser policy',()=>{
  const source=readFileSync(base,'utf8')
  assert.match(source,/--chromium-path/)
  assert.match(source,/executablePath:chromiumPath/)
  assert.match(source,/CHROMIUM_PATH_MUST_BE_ABSOLUTE/)
  const r=capture('--url','http://127.0.0.1:4173/home/?demo=1','--source-sha',revised,
    '--output','/PRIVATE/test','--chromium-path','not-an-absolute-path')
  assert.equal(r.status,2)
  assert.match(JSON.parse(r.stdout).errors.join(' '),/CHROMIUM_PATH_MUST_BE_ABSOLUTE/)
})

test('environment interpreter override must not be a relative executable',()=>{
  const r=spawnSync(process.execPath,[base,'--url','http://127.0.0.1:4173/home/?demo=1',
    '--source-sha',revised,'--output','/PRIVATE/test'],{
    encoding:'utf8',timeout:15000, env:{...process.env,URAI_GENESIS_PYTHON:'venv/python.exe'}})
  assert.equal(r.status,2)
  assert.match(JSON.parse(r.stdout).errors.join(' '),/PREFLIGHT_PYTHON_MUST_BE_ABSOLUTE_PATH/)
})
