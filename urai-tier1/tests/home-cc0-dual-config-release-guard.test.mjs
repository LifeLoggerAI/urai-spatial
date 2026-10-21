import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const ts=createRequire(import.meta.url)('typescript')
const dir=path.dirname(fileURLToPath(new URL('../next.config.mjs',import.meta.url)))
const js=fs.readFileSync(path.join(dir,'next.config.mjs'),'utf8')
const compiled=ts.transpileModule(fs.readFileSync(path.join(dir,'next.config.ts'),'utf8'),{fileName:'next.config.ts',reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}})
assert.equal(compiled.diagnostics?.length,0)
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'urai-cc0-release-'))
// Next config imports the actual local ADAM proxy; a disposable config-only
// fixture must copy its original sidecar or no release guard executes.
fs.mkdirSync(path.join(tmp,'scripts'),{recursive:true})
fs.copyFileSync(new URL('../scripts/adam-local-functions-proxy.mjs',import.meta.url),
  path.join(tmp,'scripts/adam-local-functions-proxy.mjs'))
for(const [name,body] of [['js.mjs',js],['ts.mjs',compiled.outputText]])fs.writeFileSync(path.join(tmp,name),body)
const cc0=path.join(tmp,'public/assets/urai/home-production/cc0-review')
function load(name,env){const u=pathToFileURL(path.join(tmp,name)).href;return spawnSync(process.execPath,['--input-type=module','-e',`import(${JSON.stringify(u)}).then(()=>console.log('allowed')).catch(e=>{console.error(e.message);process.exitCode=7})`],{encoding:'utf8',env:{...process.env,NODE_ENV:'development',URAI_FIREBASE_STATIC_EXPORT:'false',...env}})}
fs.mkdirSync(cc0,{recursive:true});fs.writeFileSync(path.join(cc0,'synthetic-marker'),'not an asset')
for(const name of ['js.mjs','ts.mjs']){
 test(name+' blocks unapproved preview in production',()=>{const r=load(name,{NODE_ENV:'production'});assert.equal(r.status,7);assert.match(r.stderr,/unapproved CC0 review/)})
 test(name+' blocks unapproved preview in Firebase export',()=>{const r=load(name,{URAI_FIREBASE_STATIC_EXPORT:'true'});assert.equal(r.status,7);assert.match(r.stderr,/unapproved CC0 review/)})
 test(name+' retains local development review',()=>{const r=load(name,{});assert.equal(r.status,0);assert.match(r.stdout,/allowed/)})
}
test('after removing preview files both configs can evaluate clean production',()=>{fs.rmSync(cc0,{recursive:true,force:true});for(const n of ['js.mjs','ts.mjs'])assert.equal(load(n,{NODE_ENV:'production'}).status,0)})
process.on('exit',()=>fs.rmSync(tmp,{recursive:true,force:true}))

test('private CC0 review uses a separate development-only Next cache in both configs',()=>{
  for (const name of ['js.mjs','ts.mjs']) {
    const uri = pathToFileURL(path.join(tmp,name)).href
    const inspect = (env) => spawnSync(process.execPath,['--input-type=module','-e',
      `import(${JSON.stringify(uri)}).then(m=>console.log(m.default.distDir||'default')).catch(e=>{console.error(e.message);process.exitCode=7})`],{
        encoding:'utf8',env:{...process.env,NODE_ENV:'development',CI:'false',URAI_FIREBASE_STATIC_EXPORT:'false',...env},
      })
    const isolated = inspect({NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW:'true'})
    assert.equal(isolated.status,0, isolated.stderr)
    assert.match(isolated.stdout,/\.next-home-cc0-review/)
    const ordinary = inspect({NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW:'false'})
    assert.equal(ordinary.status,0, ordinary.stderr)
    assert.match(ordinary.stdout,/default/)
    const production = inspect({NODE_ENV:'production',NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW:'true'})
    assert.equal(production.status,0, production.stderr)
    assert.match(production.stdout,/default/)
  }
})
