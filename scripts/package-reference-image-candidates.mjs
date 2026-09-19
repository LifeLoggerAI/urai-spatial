import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'

const root=process.cwd(), outDir=path.join(root,'artifacts','reference-image-candidates'), filesDir=path.join(outDir,'files')
fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(filesDir,{recursive:true})
const extensions=/\.(png|jpe?g|webp|gif|svg|avif)$/i
const tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).split('\n').map(v=>v.trim()).filter(Boolean).filter(f=>extensions.test(f)).filter(f=>!f.startsWith('_audit/')&&!f.startsWith('_quarantine/')).sort((a,b)=>a.localeCompare(b))
const expected=Number(process.env.URAI_REFERENCE_CANDIDATE_EXPECTED??'787')
if(tracked.length!==expected) throw new Error(`Active image candidate count drifted: expected ${expected}, found ${tracked.length}`)
const records=[]
for(const file of tracked){const source=path.join(root,file),dest=path.join(filesDir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);const bytes=fs.readFileSync(source);records.push({path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')})}
const summary={schema:'urai-reference-image-candidate-inventory-1',exactHead:process.env.URAI_EXACT_HEAD??null,activeCandidateCount:records.length,totalBytes:records.reduce((s,i)=>s+i.bytes,0),exclusions:['_audit/**','_quarantine/**'],records}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(outDir,'manifest.tsv'),['path\tbytes\tsha256',...records.map(i=>`${i.path}\t${i.bytes}\t${i.sha256}`)].join('\n')+'\n')
console.log(JSON.stringify({activeCandidateCount:records.length,totalBytes:summary.totalBytes}))
