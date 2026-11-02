import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const original = fileURLToPath(new URL('../scripts/run-firestore-rules-tests.mjs',import.meta.url))
const source = readFileSync(original, 'utf8')

function runCase(javaPresent, emulatorCode, staticShouldFail, overrides = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-firestore-mode-'))
  try {
    const tempScript = path.join(dir,'run-firestore-rules-tests.mjs')
    mkdirSync(path.join(dir,'firebase'), {recursive:true})
    writeFileSync(path.join(dir,'firebase','firestore.rules'), 'rules_version = "2";')
    const packageDir = path.join(dir,'node_modules','firebase-tools')
    mkdirSync(path.join(packageDir,'bin'),{recursive:true})
    writeFileSync(path.join(packageDir,'package.json'), JSON.stringify({ name:'firebase-tools', version:'0.0.0-fixture', bin:{firebase:'bin/firebase.js'}}))
    writeFileSync(path.join(packageDir,'bin','firebase.js'), "process.stdout.write('EMULATOR_FIXTURE_RAN\\n'); process.stdout.write('JAVA_PATH_FIRST='+process.env.PATH.split(require('node:path').delimiter)[0]+'\\n'); process.exit(Number(process.env.URAI_FIXTURE_EMULATOR_EXIT||0));")
    for(const name of ['assetManifests','privacyConsent','lifeModel']) {
      const t = path.join(dir,'tests',`firestore.${name}.rules.static.test.mjs`)
      mkdirSync(path.dirname(t),{recursive:true})
      writeFileSync(t, `import test from 'node:test'; test('static fixture ${name}',()=>{${staticShouldFail ? "throw new Error('STATIC_FIXTURE_FAILED');" : ''}})`)
    }
    const probe = "const javaCheck = spawnSync(javaExecutable, ['-version'], { stdio: 'ignore', shell: false })"
    assert.ok(source.includes(probe),'current Java probe anchor must exist')
    const javaProbe = overrides.javaProbe || (javaPresent
      ? '{ status: 0 }'
      : "{ status: null, error: { code: 'ENOENT' } }")
    writeFileSync(tempScript, source.replace(probe, `const javaCheck = ${javaProbe}`))
    const env = {...process.env, URAI_FIXTURE_EMULATOR_EXIT:String(emulatorCode)}
    delete env.NODE_TEST_CONTEXT
    delete env.URAI_FIRESTORE_TEST_JAVA_EXE
    if (overrides.pinnedJava) env.URAI_FIRESTORE_TEST_JAVA_EXE = overrides.pinnedJava
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

test('invalid pinned Windows Java path fails closed instead of running a weaker static check',()=>{
  const r=runCase(false,0,false,{ pinnedJava: 'not-an-absolute-java-exe' })
  assert.notEqual(r.code,0,r.stdout+'\n'+r.stderr)
  assert.match(r.stderr,/FIRESTORE_TEST_JAVA_EXECUTABLE_INVALID/)
  assert.doesNotMatch(r.stdout,/EMULATOR_FIXTURE_RAN/)
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})

test('nonzero Java version check fails without silently running static tests',()=>{
  const r=runCase(false,0,false,{ javaProbe: '{ status: 1 }' })
  assert.notEqual(r.code,0,r.stdout+'\n'+r.stderr)
  assert.match(r.stderr,/FIRESTORE_TEST_JAVA_SPAWN_FAILED:1/)
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})

test('Java spawn permission failure cannot fall back to static checks',()=>{
  const r=runCase(false,0,false,{ javaProbe: "{ status: null, error: { code: 'EACCES' } }" })
  assert.notEqual(r.code,0,r.stdout+'\n'+r.stderr)
  assert.match(r.stderr,/FIRESTORE_TEST_JAVA_SPAWN_FAILED:EACCES/)
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})

test('explicit Java controls the Firebase CLI child PATH, not only the preflight probe',()=>{
  const before = process.env.PATH
  const r=runCase(true,0,true,{pinnedJava:process.execPath})
  assert.equal(r.code,0,r.stdout+'\n'+r.stderr)
  assert.ok(r.stdout.includes('JAVA_PATH_FIRST='+path.dirname(process.execPath)))
  assert.equal(process.env.PATH,before,'parent environment must stay unchanged')
  assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
})
