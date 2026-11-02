import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lstatSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { samePrivateRegularFile } from '../scripts/private-file-integrity.mjs'

const dir=mkdtempSync(join(tmpdir(),'urai-device-identity-'))
const file=join(dir,'source.ogg')
writeFileSync(file,Buffer.from('synthetic file identity'))
const reference=lstatSync(file,{bigint:true})
const asDev = dev => Object.assign(Object.create(Object.getPrototypeOf(reference)),reference,{dev})

test('reject both Windows device IDs zero: volume identity ambiguous',()=>{
  assert.equal(samePrivateRegularFile(asDev(0n),asDev(0n),'win32'),false)
})
test('reject both negative device IDs: unsupported identity',()=>{
  assert.equal(samePrivateRegularFile(asDev(-1n),asDev(-1n),'win32'),false)
})
test('permit Windows one zero and one positive only with same immutable identity',()=>{
  assert.equal(samePrivateRegularFile(asDev(0n),asDev(123n),'win32'),true)
  assert.equal(samePrivateRegularFile(asDev(0n),asDev(123n),'linux'),false)
})
test('permit ordinary same-device source only with positive volume serial',()=>{
  assert.equal(samePrivateRegularFile(asDev(123n),asDev(123n),'win32'),true)
})
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}))
