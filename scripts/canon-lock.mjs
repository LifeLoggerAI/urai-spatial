#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const requiredDocs = ['LOCS_OVERVIEW.md','LOCS_CANON_MAP.md','TIER_1_CANON_STANDARDS.md','TIER_2_CANON_STANDARDS.md','TIER_3_CANON_STANDARDS.md','TIER_4_CANON_STANDARDS.md','TIER_5_CANON_STANDARDS.md','CANON_MIGRATION_PROCESS.md','FOUNDER_OVERRIDE_POLICY.md','NUCLEAR_CANON_LOCK.md'].map(f=>`docs/canon/${f}`)
const requiredExports = ['index.ts','locs.ts','tier1.ts','tier2.ts','tier3.ts','tier4.ts','tier5.ts','founderOverride.ts'].map(f=>`src/canon/${f}`)
const tier1Protected = ['docs/canon/TIER_1_CANON_STANDARDS.md','src/canon/tier1.ts','urai-tier1/src/app/page.tsx']
const sections=['id','official label','purpose','scope','governance level','lock level','allowed mutation level','dependencies','forbidden actions','protected phrases','protected files','required review level','required checks','migration requirements','override rules','examples from repo']

const run=(c)=>{try{return execSync(c,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(Boolean)}catch{return[]}}
const staged = run('git status --porcelain').map((l)=>l.slice(3))
const changed=run('git diff --name-only').length?Array.from(new Set([...run('git diff --name-only'),...staged])):Array.from(new Set([...run('git diff --name-only HEAD~1..HEAD'),...staged]))
const fail=(m)=>{console.error(`CANON LOCK FAIL: ${m}`);process.exit(1)}

for (const f of [...requiredDocs,...requiredExports]) if (!fs.existsSync(f)) fail(`missing required file ${f}`)
for (const f of requiredDocs.filter(f=>/TIER_[2-5]/.test(f))) {
  const t=fs.readFileSync(f,'utf8').toLowerCase();
  for (const s of sections) if(!t.includes(s)) fail(`${f} missing section: ${s}`)
}
const locsDoc=fs.readFileSync('docs/canon/LOCS_OVERVIEW.md','utf8')
if((locsDoc.match(/Tier-1/g)||[]).length>2) fail('duplicate LOCS definitions detected in LOCS_OVERVIEW.md')
const home=fs.readFileSync('docs/canon/TIER_1_CANON_STANDARDS.md','utf8').toLowerCase()
for (const phrase of ['no text','no buttons','no navigation','no onboarding','no narration','sky-primary','spatial-only','immersive','full-screen','founder-approved only for mutation']) if(!home.includes(phrase)) fail(`home invariant missing phrase ${phrase}`)

const rootPage=fs.readFileSync('urai-tier1/src/app/page.tsx','utf8').toLowerCase()
for (const blocked of ['<button','href=','onboarding','narrator']) if(rootPage.includes(blocked)) fail(`home page contains forbidden ui pattern: ${blocked}`)

const touchedTier1=changed.some(f=>tier1Protected.includes(f))
if(touchedTier1){
  const overrideFiles=fs.existsSync('canon-overrides')?fs.readdirSync('canon-overrides').filter(f=>f.endsWith('.md') && f !== 'README.md'):[]
  if(!overrideFiles.length) fail('tier-1 changed without founder override file')
  const valid = overrideFiles.some((file) => {
    const body = fs.readFileSync(path.join('canon-overrides', file), 'utf8')
    return ['FOUNDER_CANON_OVERRIDE_APPROVED','Founder: Adam Clamp','Scope:','Reason:','Files:','Expires:','Commit:','Signature:'].every((k) => body.includes(k))
  })
  if(!valid) fail('founder override malformed: required fields missing')
}
if(changed.some(f=>f.startsWith('docs/canon/')||f.startsWith('src/canon/'))){
  const marker=changed.some(f=>f.startsWith('.canon-migration/')&&f.endsWith('.md'))
  if(!marker) fail('canon changes require migration marker in .canon-migration/*.md')
}
console.log('CANON LOCK PASS: nuclear canon lock checks succeeded.')
