#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root=process.cwd()
const receiptPath=path.join(root,'operations/assets/generated-receipts/urai-human-world-pack-v1.json')
const modelRoot=path.join(root,'urai-tier1/public/assets/urai/human-world')
if(!fs.existsSync(receiptPath))throw new Error('Human World receipt missing')
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'))
if(receipt.packId!=='urai-human-world-production-pack-v1')throw new Error('Human World receipt identity mismatch')
if(receipt.cameraAspect!=='5:4'||receipt.units!=='meters')throw new Error('Human World framing/scale contract mismatch')
if(!Array.isArray(receipt.assets)||receipt.assets.length!==3)throw new Error('Exactly three Human World GLBs required')
for(const asset of receipt.assets){
  const file=path.join(modelRoot,asset.fileName)
  if(!fs.existsSync(file))throw new Error(`${asset.fileName}: missing`)
  const bytes=fs.readFileSync(file)
  const hash=crypto.createHash('sha256').update(bytes).digest('hex')
  if(bytes.length!==asset.bytes||hash!==asset.sha256)throw new Error(`${asset.fileName}: hash/size mismatch`)
  if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw new Error(`${asset.fileName}: invalid GLB header`)
  if(asset.nodes<10||asset.meshes<5)throw new Error(`${asset.fileName}: insufficient authored geometry`)
}
console.log(JSON.stringify({ok:true,packId:receipt.packId,assets:receipt.assets.map(a=>({file:a.fileName,bytes:a.bytes,nodes:a.nodes,meshes:a.meshes,animations:a.animations.length}))},null,2))
