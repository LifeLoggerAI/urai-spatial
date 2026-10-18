import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const EXPECTED='3a6a44f9a2d7a666c15cb345852977c663d17f688eec8816def2237a53fd16bc'
test('reproducible GLB contains actual ten-channel nonzero geometry; no likeness inputs',()=>{
 const temp=mkdtempSync(join(tmpdir(),'urai-anonymous-'))
 try {
  const dst=join(temp,'face.glb')
  const stdout=execFileSync(process.execPath,[new URL('../scripts/digital-human/generate-anonymous-face-glb.mjs',import.meta.url).pathname,dst],{encoding:'utf8'})
  const receipt=JSON.parse(stdout)
  const bytes=readFileSync(dst)
  const sha=createHash('sha256').update(bytes).digest('hex')
  assert.equal(sha,EXPECTED)
  assert.equal(receipt.sha256,sha)
  assert.equal(bytes.readUInt32LE(0),0x46546c67)
  assert.equal(bytes.readUInt32LE(4),2)
  assert.equal(bytes.readUInt32LE(8),bytes.byteLength)
  const len=bytes.readUInt32LE(12)
  const gltf=JSON.parse(bytes.subarray(20,20+len).toString('utf8').trimEnd())
  assert.equal(gltf.extras.approvedLikeness,false)
  assert.equal(gltf.extras.sourcePhotoInputs,0)
  assert.equal(gltf.skins?.length??0,0)
  const morphable=gltf.meshes.filter(x=>x.weights?.length)
  assert.equal(morphable.length,6)
  assert.equal(morphable[0].weights.length,10)
  assert.deepEqual(morphable[0].extras.targetNames,['jawOpen','AA','EE','OO','PP','blinkLeft','blinkRight','browInnerUp','mouthSmileLeft','mouthSmileRight'])
  let nonzero=0
  for (const mesh of morphable) {
   const p=mesh.primitives[0]
   assert.equal(p.targets.length,10)
   for(const target of p.targets){
    const accessor=gltf.accessors[target.POSITION]
    const view=gltf.bufferViews[accessor.bufferView]
    const binOffset=20+len+8+view.byteOffset
    for(let i=0;i<Math.min(view.byteLength,accessor.count*12);i+=4){
     const v=bytes.readFloatLE(binOffset+i)
     if(Math.abs(v)>1e-6)nonzero++
    }
   }
  }
  assert.ok(nonzero>100,'facial targets must have nonzero vertex displacement')
 } finally {rmSync(temp,{recursive:true,force:true})}
})
