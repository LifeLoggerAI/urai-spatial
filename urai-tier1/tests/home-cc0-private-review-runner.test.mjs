import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../../scripts/run-home-cc0-private-review.mjs', import.meta.url))
const invoke = (overrides = {}, action = 'preflight') => spawnSync(process.execPath,[script,action],{
  encoding:'utf8',
  env: {...process.env, NODE_ENV:'development',CI:'false',URAI_FIREBASE_STATIC_EXPORT:'false',...overrides},
})

test('strict nonproduction preflight does not download or stage review assets',()=>{
  const r = invoke()
  assert.equal(r.status,0,r.stderr)
  const verdict = JSON.parse(r.stdout.trim())
  assert.equal(verdict.ok,true)
  assert.equal(verdict.releaseApproved,false)
  assert.equal(verdict.productionPromotion,false)
  assert.equal(verdict.sourceFiles,11)
  assert.equal(verdict.dedicatedBuildOutput,'.next-home-cc0-review')
})
test('private review refuses production even when dev preview was requested',()=>{
  for(const overrides of [
    {NODE_ENV:'production'},
    {CI:'true'},
    {URAI_FIREBASE_STATIC_EXPORT:'true'},
  ]){
    const r = invoke(overrides)
    assert.notEqual(r.status,0)
    assert.match(r.stderr,/Refusing private CC0 review/)
  }
})
test('unknown review actions do not stage anything',()=>{
  const r=invoke({},'promote')
  assert.notEqual(r.status,0)
  assert.match(r.stderr,/Usage:/)
})

test('separate review output and binaries cannot be accidentally committed',()=>{
  const ignore = fileURLToPath(new URL('../.gitignore', import.meta.url))
  const text = readFileSync(ignore, 'utf8')
  assert.match(text, /^\/\.next-home-cc0-review\/$/m)
  assert.match(text, /^\/public\/assets\/urai\/home-production\/cc0-review\/$/m)
})
