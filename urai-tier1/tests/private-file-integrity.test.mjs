import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, lstatSync, rmSync, renameSync, symlinkSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { verifiedPrivateFileHash } from '../scripts/private-file-integrity.mjs'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'urai-file-integrity-'))
  const path = join(dir,'original.ogg')
  const bytes = Buffer.from('OggS....OpusHead...synthetic-source-only')
  writeFileSync(path,bytes)
  return { dir,path,bytes,expected:lstatSync(path),cleanup:()=>rmSync(dir,{recursive:true,force:true}) }
}
test('verified hash accepts unchanged regular source', async()=>{
  const f=fixture();try{assert.equal(await verifiedPrivateFileHash(f.path,f.expected),createHash('sha256').update(f.bytes).digest('hex'))}finally{f.cleanup()}
})
test('rejects source mutation after initial stat',async()=>{
 const f=fixture();try{appendFileSync(f.path,'CHANGED');await assert.rejects(verifiedPrivateFileHash(f.path,f.expected),/PRIVATE_SOURCE_CHANGED/)}finally{f.cleanup()}
})
test('rejects replacement inode even when size and contents match',async()=>{
 const f=fixture();try{const p=join(f.dir,'replacement');writeFileSync(p,f.bytes);renameSync(p,f.path);await assert.rejects(verifiedPrivateFileHash(f.path,f.expected),/PRIVATE_SOURCE_CHANGED/)}finally{f.cleanup()}
})
test('rejects a symlink substituted for the regular source',async()=>{
 const f=fixture();try{const p=join(f.dir,'target');renameSync(f.path,p);symlinkSync(p,f.path);await assert.rejects(verifiedPrivateFileHash(f.path,f.expected),/PRIVATE_SOURCE_CHANGED/)}finally{f.cleanup()}
})
