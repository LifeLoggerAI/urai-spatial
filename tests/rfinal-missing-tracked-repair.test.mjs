import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,unlinkSync,symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { planMissingTrackedRepair,isIsolatedRfinalSource } from '../scripts/rfinal-missing-tracked-repair.mjs'

const git=(cwd,args)=>{const r=spawnSync('git',args,{cwd,encoding:null,windowsHide:true});assert.equal(r.status,0,String(r.stderr));return r.stdout}
const status=cwd=>git(cwd,['status','--porcelain=v1','-z','--untracked-files=no'])
test('1,075 missing tracked files: restore worktree only, keep index and original',()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'urai-rfinal-rest-'))
  try {
    const src=path.join(tmp,'origin');mkdirSync(src)
    git(src,['init','-q']);git(src,['config','user.email','fixture@example.invalid']);git(src,['config','user.name','Fixture'])
    const paths=['package.json','.github/workflows/ci.yml','urai-tier1/src/app/replay/page.tsx',...Array.from({length:1072},(_,i)=>'proof/file-'+i+'.txt')]
    for(const p of paths){const f=path.join(src,...p.split('/'));mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,p+'\n')}
    git(src,['add','-A']);git(src,['commit','-qm','fixture'])
    const clone=path.join(tmp,'URAI_RFINAL_V4_fixture','source');mkdirSync(path.dirname(clone),{recursive:true})
    git(tmp,['clone','-q','--no-checkout',src,clone]);git(clone,['checkout','-q','--detach','HEAD'])
    const head=String(git(clone,['rev-parse','HEAD'])).trim(), tree=String(git(clone,['write-tree'])).trim()
    for(const p of paths)unlinkSync(path.join(clone,...p.split('/')))
    const plan=planMissingTrackedRepair(status(clone));assert.equal(plan.count,1075)
    const spec=path.join(tmp,'paths.bin');writeFileSync(spec,plan.pathspecBytes)
    git(clone,['restore','--source=HEAD','--worktree','--pathspec-from-file='+spec,'--pathspec-file-nul'])
    assert.equal(status(clone).length,0)
    assert.equal(String(git(clone,['rev-parse','HEAD'])).trim(),head)
    assert.equal(String(git(clone,['write-tree'])).trim(),tree)
    assert.equal(readFileSync(path.join(src,'package.json'),'utf8'),'package.json\n')
  } finally {rmSync(tmp,{recursive:true,force:true})}
})
test('refuse modified/staged, unsafe, excluded, malformed, excessive or duplicate entries',()=>{
  for(const s of [' M p\0','M  p\0','D  p\0',' D ../x\0',' D .git/config\0',' D .ai-backups/x\0',' D _quarantine/x\0',' D urai-tier1/old-audit/x\0',' D bad:stream\0',' D p'])assert.throws(()=>planMissingTrackedRepair(Buffer.from(s)))
  assert.throws(()=>planMissingTrackedRepair(Buffer.from(' D P\0 D p\0')))
  assert.throws(()=>planMissingTrackedRepair(Buffer.from(' D a\0 D b\0'),1))
  assert.equal(planMissingTrackedRepair(Buffer.alloc(0)).count,0)
})
test('repair path must be a materialized isolated clone with its own .git directory',()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'urai-isolation-guard-'))
  try {
    const d=path.join(tmp,'Downloads');mkdirSync(d)
    for(const prefix of ['URAI_RFINAL_NATIVE_','URAI_RFINAL_V2_','URAI_RFINAL_V4_']){
      const source=path.join(d,prefix+'fixture','source')
      mkdirSync(source,{recursive:true})
      assert.equal(isIsolatedRfinalSource(source,d),false,'no .git directory')
      mkdirSync(path.join(source,'.git'))
      assert.equal(isIsolatedRfinalSource(source,d),true,'real isolated checkout')
    }
    assert.equal(isIsolatedRfinalSource(path.join(d,'UrAi-Sparse-Recovered-f904e48'),d),false)
    assert.equal(isIsolatedRfinalSource(path.join(d,'URAI_RFINAL_V4_fixture','other'),d),false)
  }finally{rmSync(tmp,{recursive:true,force:true})}
})
test('a symlink to the original founder checkout is never admitted for worktree restore',t=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'urai-restore-alias-'))
  try {
    const d=path.join(tmp,'Downloads');mkdirSync(d)
    const original=path.join(tmp,'original-founder-worktree');mkdirSync(original);mkdirSync(path.join(original,'.git'))
    const run=path.join(d,'URAI_RFINAL_V4_pointer');mkdirSync(run)
    const source=path.join(run,'source')
    try {symlinkSync(original,source,process.platform==='win32'?'junction':'dir')}
    catch(error){if(error.code==='EPERM'||error.code==='EACCES'){t.skip('OS forbids fixture junction creation');return}throw error}
    assert.equal(isIsolatedRfinalSource(source,d),false)
    assert.equal(isIsolatedRfinalSource(original,d),false)
  }finally{rmSync(tmp,{recursive:true,force:true})}
})
test('a redirected run directory or linked Git metadata cannot acquire restore authority',t=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'urai-restore-runroot-'))
  try {
    const d=path.join(tmp,'Downloads');mkdirSync(d)
    const externalRun=path.join(tmp,'external-run');mkdirSync(externalRun)
    const target=path.join(externalRun,'source');mkdirSync(target);mkdirSync(path.join(target,'.git'))
    const run=path.join(d,'URAI_RFINAL_V2_redirected')
    try {symlinkSync(externalRun,run,process.platform==='win32'?'junction':'dir')}
    catch(error){if(error.code==='EPERM'||error.code==='EACCES'){t.skip('OS forbids fixture junction creation');return}throw error}
    assert.equal(isIsolatedRfinalSource(path.join(run,'source'),d),false)
    const honest=path.join(d,'URAI_RFINAL_V4_real','source');mkdirSync(honest,{recursive:true})
    writeFileSync(path.join(honest,'.git'),'gitdir: /another/worktree/.git/worktrees/fixture\n')
    assert.equal(isIsolatedRfinalSource(honest,d),false,'reject linked Git worktree metadata')
  }finally{rmSync(tmp,{recursive:true,force:true})}
})
