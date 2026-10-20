import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const original = fileURLToPath(new URL('../scripts/run-firestore-rules-tests.mjs',import.meta.url))
const source = readFileSync(original, 'utf8')

function runCase(javaPresent, emulatorCode, staticShouldFail) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-firestore-mode-'))
  try {
    const tempScript = path.join(dir,'run-firestore-rules-tests.mjs')
    mkdirSync(path.join(dir,'firebase'), {recursive:true})
    writeFileSync(path.join(dir,'firebase','firestore.rules'), 'rules_version = "2";')
    const packageDir = path.join(dir,'node_modules','firebase-tools')
    mkdirSync(path.join(packageDir,'bin'),{recursive:true})
    writeFileSync(path.join(packageDir,'package.json'), JSON.stringify({ name:'firebase-tools', version:'0.0.0-fixture', bin:{firebase:'bin/firebase.js'}}))
    writeFileSync(path.join(packageDir,'bin','firebase.js'), "process.stdout.write('EMULATOR_FIXTURE_RAN\\n'); process.exit(Number(process.env.URAI_FIXTURE_EMULATOR_EXIT||0));")
    for(const name of ['assetManifests','privacyConsent','lifeModel']) {
      const t = path.join(dir,'tests',`firestore.${name}.rules.static.test.mjs`)
      mkdirSync(path.dirname(t),{recursive:true})
      writeFileSync(t, `import test from 'node:test'; test('static fixture ${name}',()=>{${staticShouldFail ? "throw new Error('STATIC_FIXTURE_FAILED');" : ''}})`)
    }
    const probe = "const javaCheck = spawnSync('java', ['-version'], { stdio: 'ignore', shell: false })"
    assert.ok(source.includes(probe),'original Java probe anchor must exist')
    writeFileSync(tempScript, source.replace(probe, `const javaCheck = { status: ${javaPresent ? 0 : 1} }`))
    const env = {...process.env, URAI_FIXTURE_EMULATOR_EXIT:String(emulatorCode)}
    delete env.NODE_TEST_CONTEXT
    const run=spawnSync(process.execPath,[tempScript],{cwd:dir,encoding:'utf8',env})
    return {code:run.status,stdout:run.stdout,stderr:run.stderr}
  }finally{rmSync(dir,{recursive:true,force:true})}
}

test('emulator success must not run static fallback',()=>{
  const r=runCase(true,0,true)
  assert.equal(r.code,0,r.stdout+'\n'+r.stderr)
  assert.match(r.stdout,/EMULATOR_FIXTURE_RAN/)
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})
test('emulator failure must remain a failure despite passing static tests',()=>{
  const r=runCase(true,3,false)
  assert.equal(r.code,3,r.stdout+'\n'+r.stderr)
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})
test('Java unavailable runs static tests only',()=>{
  const r=runCase(false,0,false)
  assert.equal(r.code,0,r.stdout+'\n'+r.stderr)
  assert.doesNotMatch(r.stdout,/EMULATOR_FIXTURE_RAN/)
  assert.match(r.stderr,/Running static Firestore rules boundary tests instead/)
  assert.match(r.stdout, /# tests 3/)
})
test('Java unavailable does not suppress static rules failure',()=>{
  const r=runCase(false,0,true)
  assert.notEqual(r.code,0,r.stdout+'\n'+r.stderr)
  assert.match(r.stderr,/Running static Firestore rules boundary tests instead/)
})
