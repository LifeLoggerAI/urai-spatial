// R1548 release boundary: root Firebase static-export entrypoints must reject
// stale review fixtures and explicitly enabled review generation before Next.
// Runs the real root package script values in temp directories; stubbed compiler.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const commands = ['build:static', 'next-export']
const FACE = 'public/__digital-human-dev/anonymous-face-morph-v1.glb'
const SPLAT = 'public/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const controlled = [
  'URAI_REVIEW_VISUAL_FIXTURES','NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION',
  'NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET','URAI_FIREBASE_STATIC_EXPORT',
  'VERCEL','URAI_PRODUCTION_RELEASE'
]

function createWorkspace(t) {
  const dir = mkdtempSync(join(tmpdir(), 'urai-r1548-root-export-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir,'scripts'), { recursive: true })
  mkdirSync(join(dir,'urai-tier1/scripts'), { recursive: true })
  copyFileSync(join(root,'urai-tier1/scripts/generate-review-visual-fixtures.mjs'),
               join(dir,'urai-tier1/scripts/generate-review-visual-fixtures.mjs'))
  const commandsObject = Object.fromEntries(commands.map(k=>{
    assert.ok(rootPackage.scripts[k], `missing root build command ${k}`)
    return [k,rootPackage.scripts[k]]
  }))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type:'module', scripts:commandsObject }))
  writeFileSync(join(dir,'scripts/run-pnpm.mjs'), [
    "import {appendFileSync} from 'node:fs'",
    "appendFileSync(process.env.URAI_R1548_TEST_LOG, JSON.stringify({args:process.argv.slice(2),static:process.env.URAI_FIREBASE_STATIC_EXPORT})+'\\n')"
  ].join('\n'))
  writeFileSync(join(dir,'scripts/prepare-low-disk-build.mjs'), "import {appendFileSync} from 'node:fs'\nappendFileSync(process.env.URAI_R1548_TEST_LOG,'PREPARE\\n')\n")
  return {dir, log:join(dir,'exec.log')}
}
function run(h,script,flags={}) {
  const env={...process.env,URAI_R1548_TEST_LOG:h.log}
  for(const key of controlled) delete env[key]
  Object.assign(env,flags)
  const proc=spawnSync('npm',['run','--silent',script],{cwd:h.dir,env,encoding:'utf8',timeout:15000})
  if(proc.error) throw proc.error
  const text=existsSync(h.log)?readFileSync(h.log,'utf8'):''
  // Check specifically whether the real compiler command was reached.
  const nextCalled=text.includes('exec')&&text.includes('next')&&text.includes('build')
  return {status:proc.status,output:proc.stdout+'\n'+proc.stderr,nextCalled,prepareCalled:text.includes('PREPARE'),log:text}
}
function seed(h,rel) {
  const f=join(h.dir,'urai-tier1',rel)
  mkdirSync(dirname(f),{recursive:true})
  writeFileSync(f,'R1548_STALE_MARKER_NO_BINARY')
  return f
}
for(const cmd of commands){
  test(`${cmd}: fresh static-export build is allowed with no review artifacts`,t=>{
    const h=createWorkspace(t)
    const o=run(h,cmd)
    assert.equal(o.status,0,o.output)
    assert.equal(o.nextCalled,true,'mock compiler should have been called')
    assert.equal(existsSync(join(h.dir,'urai-tier1',FACE)),false)
    assert.equal(existsSync(join(h.dir,'urai-tier1',SPLAT)),false)
  })
  for(const rel of [FACE,SPLAT]){
    test(`${cmd}: stale ${rel} blocks before Next and preserves evidence`,t=>{
      const h=createWorkspace(t)
      const file=seed(h,rel)
      const o=run(h,cmd)
      assert.notEqual(o.status,0,`stale ${rel} must block ${cmd}`)
      assert.match(o.output,/R1548_REVIEW_FIXTURES_STALE_OUTPUT_DENIED/)
      assert.equal(o.nextCalled,false, 'must stop before compiler')
      assert.equal(o.prepareCalled,false, 'must stop before build preparation')
      assert.equal(readFileSync(file,'utf8'),'R1548_STALE_MARKER_NO_BINARY')
    })
  }
  test(`${cmd}: explicit review opts in cannot generate static export assets`,t=>{
    const h=createWorkspace(t)
    const o=run(h,cmd,{URAI_REVIEW_VISUAL_FIXTURES:'true',NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION:'true'})
    assert.notEqual(o.status,0, 'static export is a release boundary even without Vercel')
    assert.match(o.output,/R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD/)
    assert.equal(o.nextCalled,false)
    assert.equal(o.prepareCalled,false)
    assert.equal(existsSync(join(h.dir,'urai-tier1',FACE)),false)
  })
  test(`${cmd}: explicitly Vercel-hosted review generation is denied`,t=>{
    const h=createWorkspace(t)
    const o=run(h,cmd,{URAI_REVIEW_VISUAL_FIXTURES:'true',NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION:'true',VERCEL:'1'})
    assert.notEqual(o.status,0)
    assert.match(o.output,/R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD/)
    assert.equal(o.nextCalled,false)
  })
  test(`${cmd}: explicitly production-marked review generation is denied`,t=>{
    const h=createWorkspace(t)
    const o=run(h,cmd,{URAI_REVIEW_VISUAL_FIXTURES:'true',NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION:'true',URAI_PRODUCTION_RELEASE:'true'})
    assert.notEqual(o.status,0)
    assert.match(o.output,/R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD/)
    assert.equal(o.nextCalled,false)
  })
}
