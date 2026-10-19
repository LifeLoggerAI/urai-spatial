#!/usr/bin/env node
// Explicit local-only real CC0 source review, never a production asset promotion.
import { createHash } from 'node:crypto'
import { readFile, copyFile, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const receipt = JSON.parse(await readFile(path.join(root, 'operations/assets/candidates/home-polyhaven-cc0-dev-review-1.json'), 'utf8'))
const sourceDir = path.join(root, 'urai-tier1/dev-preview-sources/home-polyhaven-cc0')
const destDir = path.join(root, 'urai-tier1/public/assets/urai/home-production/cc0-review')
const exportDir = path.join(root, 'urai-tier1/out/assets/urai/home-production/cc0-review')
const validPaths = new Set(receipt.files.map(x => x.path))
const command = process.argv[2]
function safeRelative(rel) {
  if (!validPaths.has(rel) || path.isAbsolute(rel) || rel.split('/').some(x=> x==='..'||x==='.'||!x)) throw Error('Unapproved CC0 path: '+rel)
  return rel
}
async function verifyFile(file, entry) {
  const bytes=await readFile(file)
  const md5=createHash('md5').update(bytes).digest('hex')
  if (bytes.length!==entry.bytes || md5!==entry.md5) throw Error('CC0 source checksum mismatch '+entry.path)
  if (entry.path.endsWith('.jpg') && !(bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff)) throw Error('Not JPEG '+entry.path)
  if (entry.path.endsWith('.gltf') && JSON.parse(bytes.toString('utf8')).asset?.version!=='2.0') throw Error('Not glTF 2.0 '+entry.path)
  return {path:entry.path,bytes:bytes.length,md5}
}
async function verifySource() {
  const results=[]
  for (const entry of receipt.files) {
    safeRelative(entry.path)
    const file=path.join(sourceDir,entry.path)
    const s=await stat(file)
    if (!s.isFile()||s.isSymbolicLink()) throw Error('CC0 source must be regular file')
    results.push(await verifyFile(file,entry))
  }
  return results
}
function rejectRelease() {
  if (process.env.NODE_ENV==='production'||process.env.URAI_FIREBASE_STATIC_EXPORT==='true'||process.env.CI==='true') throw Error('Nonproduction CC0 candidate is not allowed in release/CI context')
}
if (receipt.classification!=='NONPRODUCTION_CANDIDATE_UNAPPROVED'||receipt.releaseApproved!==false||receipt.reviewApproved!==false||receipt.license!=='CC0-1.0') throw Error('Nonproduction/rights classification changed')
try {
  if (command==='verify-source') console.log(JSON.stringify({ok:true,classification:receipt.classification,files:await verifySource()}))
  else if (command==='stage') {
    rejectRelease()
    const files=await verifySource() // ALL must be present before any copy
    await rm(destDir,{recursive:true,force:true})
    for (const entry of receipt.files) {
      const target=path.join(destDir,safeRelative(entry.path))
      await mkdir(path.dirname(target),{recursive:true})
      await copyFile(path.join(sourceDir,entry.path),target)
      await verifyFile(target,entry)
    }
    console.log(JSON.stringify({staged:files.length,mode:'LOCAL_DEV_ONLY',releaseApproved:false}))
  } else if (command==='clean') {
    await rm(destDir,{recursive:true,force:true})
    console.log(JSON.stringify({cleaned:true}))
  } else if (command==='assert-excluded') {
    if (existsSync(destDir)||existsSync(exportDir)) throw Error('Release blocked: CC0 review candidate remains staged in public/ or out/')
    console.log(JSON.stringify({excluded:true}))
  } else throw Error('Usage: node scripts/home-cc0-source-review.mjs verify-source|stage|clean|assert-excluded')
} catch(error){ console.error(String(error?.stack||error)); process.exitCode=1 }
