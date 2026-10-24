import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const original = fileURLToPath(new URL('../scripts/run-firestore-rules-tests.mjs',import.meta.url))
const helper = fileURLToPath(new URL('../scripts/lib/firestore-java-runtime.mjs',import.meta.url))
const source = readFileSync(original, 'utf8')

function runCase(javaPresent, emulatorCode, staticShouldFail, overrides = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-firestore-mode-'))
  try {
    const tempScript = path.join(dir,'run-firestore-rules-tests.mjs')
    mkdirSync(path.join(dir,'lib'), {recursive:true})
    writeFileSync(path.join(dir,'lib','firestore-java-runtime.mjs'),readFileSync(helper,'utf8'))
    mkdirSync(path.join(dir,'firebase'), {recursive:true})
    writeFileSync(path.join(dir,'firebase','firestore.rules'), 'rules_version = "2";')
    const packageDir = path.join(dir,'node_modules','firebase-tools')
    mkdirSync(path.join(packageDir,'bin'),{recursive:true})
    writeFileSync(path.join(packageDir,'package.json'), JSON.stringify({ name:'firebase-tools', version:'0.0.0-fixture', bin:{firebase:'bin/firebase.js'}}))
    writeFileSync(path.join(packageDir,'bin','firebase.js'), "const path = require('node:path'); const key = Object.keys(process.env).find(x=>x.toLowerCase()==='path')||'PATH'; process.stdout.write('EMULATOR_FIXTURE_RAN\\n'); process.stdout.write('JAVA_PATH_FIRST='+(process.env[key]||'').split(path.delimiter)[0]+'\\n'); process.exit(Number(process.env.URAI_FIXTURE_EMULATOR_EXIT||0));")
    for(const name of ['assetManifests','privacyConsent','lifeModel']) {
      const t = path.join(dir,'tests',`firestore.${name}.rules.static.test.mjs`)
      mkdirSync(path.dirname(t),{recursive:true})
      writeFileSync(t, `import test from 'node:test'; test('static fixture ${name}',()=>{${staticShouldFail ? "throw new Error('STATIC_FIXTURE_FAILED');" : ''}})`)
    }
    const probe = "const javaCheck = spawnSync(javaExecutable, ['-version'], { encoding: 'utf8', shell: false })"
    assert.ok(source.includes(probe),'current Java probe anchor must exist')
    const javaProbe = overrides.javaProbe || (javaPresent
      ? `{ status: 0, stderr: 'openjdk version "21.0.4"' }`
      : "{ status: null, error: { code: 'ENOENT' } }")
    writeFileSync(tempScript, source.replace(probe, `const javaCheck = ${javaProbe}`))
    const env = {...process.env, URAI_FIXTURE_EMULATOR_EXIT:String(emulatorCode)}
    delete env.NODE_TEST_CONTEXT
    delete env.URAI_FIRESTORE_TEST_JAVA_EXE
    delete env.CI
    delete env.URAI_FIRESTORE_EMULATOR_REQUIRED
    if (overrides.pinnedJava) env.URAI_FIRESTORE_TEST_JAVA_EXE = overrides.pinnedJava
    if (overrides.ci) env.CI = overrides.ci
    if (overrides.strict) env.URAI_FIRESTORE_EMULATOR_REQUIRED = overrides.strict
    const run=spawnSync(process.execPath,[tempScript],{cwd:dir,encoding:'utf8',env,timeout:30000})
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

test('CI requires a real emulator: ambient Java ENOENT must never run static tests',()=>{
  for (const mode of [{ci:'1'},{ci:'true'},{strict:'1'}]) {
    const r=runCase(false,0,false,mode)
    assert.notEqual(r.code,0,JSON.stringify(mode)+r.stdout+r.stderr)
    assert.match(r.stderr,/FIRESTORE_EMULATOR_REQUIRED_JAVA_UNAVAILABLE/)
    assert.doesNotMatch(r.stderr,/Running static Firestore rules boundary tests instead/)
  }
})
test('Java 17 cannot satisfy the Firebase emulator prerequisite',()=>{
  const r=runCase(true,0,false,{javaProbe:`{ status: 0, stderr: 'openjdk version "17.0.16"' }`})
  assert.notEqual(r.code,0,r.stdout+r.stderr)
  assert.match(r.stderr,/FIRESTORE_EMULATOR_REQUIRES_JAVA_21_FOUND_17/)
  assert.doesNotMatch(r.stdout,/EMULATOR_FIXTURE_RAN/)
})
test('unknown Java version banner rejects both emulator and static fallback',()=>{
  const r=runCase(true,0,false,{javaProbe:`{ status: 0, stderr: 'Unknown Runtime v20' }`})
  assert.notEqual(r.code,0,r.stdout+r.stderr)
  assert.match(r.stderr,/FIRESTORE_TEST_JAVA_VERSION_UNVERIFIABLE/)
  assert.doesNotMatch(r.stdout,/EMULATOR_FIXTURE_RAN/)
})
