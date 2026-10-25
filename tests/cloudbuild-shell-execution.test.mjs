import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const yaml = readFileSync(new URL('../cloudbuild.urai-verify.yaml', import.meta.url), 'utf8')

function extractScripts(source) {
  const lines = source.split(/\r?\n/)
  const blocks = []
  for (let i=0; i<lines.length; i++) {
    if (lines[i] !== '      - |') continue
    const commands = []
    for (let j=i+1; j<lines.length; j++) {
      if (!lines[j].startsWith('        ') && lines[j] !== '') break
      commands.push(lines[j].startsWith('        ') ? lines[j].slice(8) : '')
    }
    blocks.push(commands.join('\n').split('$$').join('$'))
  }
  return blocks
}
function bash(code, env={}) {
  return spawnSync('bash',['-ceu',code],{
    encoding:'utf8', timeout: 4000,
    env: {...process.env, URAI_SOURCE_BRANCH:'verify/r4-firestore-java21-admission-20261023',
      URAI_SOURCE_SHA:'a'.repeat(40), URAI_VERIFIER_SA:'urai-verifier@urai-qa-123.iam.gserviceaccount.com',
      URAI_CLOUD_PROJECT:'urai-qa-123', ...env},
  })
}
const scripts=extractScripts(yaml)
const prefix=scripts[0]?.split('export GIT_TERMINAL_PROMPT=0')[0]

test('Cloud Build carries two real bash step bodies that parse after substitutions',()=> {
  assert.equal(scripts.length,2)
  for(const script of scripts) {
    const r=bash("bash -n <<'END_SCRIPT'\n"+script+"\nEND_SCRIPT")
    assert.equal(r.status,0, r.stderr)
  }
})
test('source + verifier preflight accepts only pinned, local nonproduction identity',()=>{
  assert.ok(prefix?.includes('INVALID_SOURCE_SHA'))
  const positive=bash(prefix+'\necho PREFLIGHT_OK')
  assert.equal(positive.status,0,positive.stderr+' '+positive.stdout)
  assert.match(positive.stdout,/PREFLIGHT_OK/)
  const negatives=[
    [{URAI_SOURCE_SHA:'z'.repeat(40)},'INVALID_SOURCE_SHA'],
    [{URAI_SOURCE_BRANCH:'main'},'INVALID_SOURCE_BRANCH'],
    [{URAI_VERIFIER_SA:'verifier@another-project.iam.gserviceaccount.com'},'VERIFIER_NOT_PROJECT_LOCAL'],
    [{URAI_VERIFIER_SA:'not-an-email'},'INVALID_VERIFIER_SA_EMAIL'],
    [{URAI_CLOUD_PROJECT:'urai-4dc1d',URAI_VERIFIER_SA:'urai-verifier@urai-4dc1d.iam.gserviceaccount.com'},'PRODUCTION_PROJECT_FORBIDDEN'],
  ]
  for(const [env,error] of negatives){
    const r=bash(prefix+'\necho SHOULD_NOT_EXECUTE',env)
    assert.notEqual(r.status,0,JSON.stringify(env))
    assert.ok(r.stdout.includes(error),error+" missing from "+r.stdout)
    assert.doesNotMatch(r.stdout,/SHOULD_NOT_EXECUTE/)
  }
})
test('real Cloud Build gate runner emits correct JSON for pass AND failure',()=>{
  const start=scripts[1].indexOf('receipt_path=')
  // Isolate only the shell runner definition. New verification stages must not
  // be executed by this synthetic two-receipt test: they are tested separately.
  const end=scripts[1].indexOf('\nrun_gate ',start)
  assert.ok(start>=0&&end>start)
  let body=scripts[1].slice(start,end)
  assert.doesNotMatch(body,/^run_gate\s+/m,'Fixture must not execute real verification gates')
  body=body.split('receipt_path="/workspace/urai-spatial/.urai-cloudbuild-gates.ndjson"').join('receipt_path="$URAI_TEST_RECEIPT"')
  const dir=mkdtempSync(join(tmpdir(),'urai-cloudbuild-proof-'))
  const receipt=join(dir,'gate.ndjson')
  try {
    const r=bash(body+"\nrun_gate success bash -c 'exit 0'\nrun_gate denied bash -c 'exit 7'\ntest \"$failed\" = 1\necho GATE_RUN_COMPLETE\n",{URAI_TEST_RECEIPT:receipt})
    assert.equal(r.status,0,r.stderr+' '+r.stdout)
    const records=readFileSync(receipt,'utf8').trim().split('\n').map(JSON.parse)
    assert.equal(records.length,2)
    assert.deepEqual(records.map(x=>[x.gate,x.outcome,x.exitCode]),[['success','PASS',0],['denied','FAIL',7]])
    assert.ok(records.every(x=>x.sourceSHA==='a'.repeat(40)&&x.schema==='urai-cloudbuild-gate-v1'))
    assert.equal((r.stdout.match(/URAI_GATE_JSON=/g)||[]).length,2)
  }finally{rmSync(dir,{recursive:true,force:true})}
})
