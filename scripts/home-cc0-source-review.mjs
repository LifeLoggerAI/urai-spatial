#!/usr/bin/env node
// Explicit local-only real CC0 source review, never a production asset promotion.
import { createHash } from 'node:crypto'
import { readFile, copyFile, mkdir, rm, stat, writeFile, rename, lstat } from 'node:fs/promises'
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
    const s=await lstat(file)
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
  if (command==='acquire') {
    rejectRelease()
    // 1K files only, pinned HTTPS origins and identity; no paid providers.
    // Source is first verified in a local private directory, never public/.
    const obtained=[]
    for (const entry of receipt.files) {
      const rel=safeRelative(entry.path)
      const target=path.join(sourceDir,rel)
      await mkdir(path.dirname(target),{recursive:true})
      if (existsSync(target)) {
        await verifyFile(target,entry)
        obtained.push({path:rel,source:'existing-verified'})
        continue
      }
      const remote=new URL(entry.url)
      if(remote.protocol!=='https:' || remote.hostname!=='dl.polyhaven.org' || entry.bytes>5000000) throw Error('Unapproved external file '+rel)
      const response=await fetch(remote, {redirect:'error',signal:AbortSignal.timeout(60000)})
      if(!response.ok) throw Error('Poly Haven download failed '+rel+': '+response.status)
      const data=Buffer.from(await response.arrayBuffer())
      if(data.length!==entry.bytes || createHash('md5').update(data).digest('hex')!==entry.md5) throw Error('Downloaded identity mismatch '+rel)
      const temp=target+'.tmp-'+process.pid
      try {
        await writeFile(temp,data,{flag:'wx'})
        await verifyFile(temp,entry)
        await rename(temp,target)
      } finally {await rm(temp,{force:true})}
      obtained.push({path:rel,source:'PolyHaven-official-verified'})
    }
    console.log(JSON.stringify({acquired:obtained,classification:receipt.classification,releaseApproved:false}))
  } else if (command==='verify-source') console.log(JSON.stringify({ok:true,classification:receipt.classification,files:await verifySource()}))
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
  } else throw Error('Usage: node scripts/home-cc0-source-review.mjs acquire|verify-source|stage|clean|assert-excluded')
} catch(error){ console.error(String(error?.stack||error)); process.exitCode=1 }
