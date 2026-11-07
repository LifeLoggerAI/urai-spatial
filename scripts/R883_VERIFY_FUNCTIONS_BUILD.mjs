#!/usr/bin/env node
// One UrAi Genesis R883: offline Functions source-closure and compiled-output identity.
// No provider calls, no credentials, no deployment or install operations.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, posix } from 'node:path'
import { pathToFileURL } from 'node:url'

const sha40=/^[0-9a-f]{40}$/
const sha256=/^[0-9a-f]{64}$/
const runIdPattern=/^[1-9][0-9]*$/
const inputPaths=[
  ['apps/functions','tree'], ['packages/tier-locks/src','tree'],
  ['pnpm-lock.yaml','blob'], ['package.json','blob'], ['pnpm-workspace.yaml','blob'],
  ['firebase.json','blob'],
]
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
function ensureRegularDir(file){const st=lstatSync(file);if(st.isSymbolicLink()||!st.isDirectory())throw new Error(`Nonregular compiled directory: ${file}`)}
function collect(dir,prefix=''){
  ensureRegularDir(dir)
  const files=[]
  for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const rel=posix.join(prefix,entry.name)
    if(rel.split('/').some(x=>x.startsWith('.')))throw new Error(`Dot-path in compiled output: ${rel}`)
    const abs=join(dir,entry.name),st=lstatSync(abs)
    if(st.isSymbolicLink())throw new Error(`Symlink in compiled output: ${rel}`)
    if(st.isDirectory())files.push(...collect(abs,rel))
    else if(st.isFile()){const bytes=readFileSync(abs);files.push({path:rel,bytes:bytes.length,sha256:hash(bytes)})}
    else throw new Error(`Nonregular compiled file: ${rel}`)
  }
  return files.sort((a,b)=>a.path.localeCompare(b.path))
}
function context(repoRoot,expectedSha,runId){
  if(!sha40.test(expectedSha)||!runIdPattern.test(String(runId)))throw new Error('Expected exact release SHA and numeric workflow run ID')
  const root=resolve(repoRoot),head=git(root,['rev-parse','HEAD'])
  if(head!==expectedSha)throw new Error('Checkout HEAD does not match expected merged release SHA')
  // Reject modified tracked source and untracked source that might enter the TypeScript compilation.
  for(const cmd of [['diff','--quiet','HEAD','--','apps/functions','packages/tier-locks/src','pnpm-lock.yaml','package.json','pnpm-workspace.yaml','firebase.json'],['diff','--cached','--quiet','HEAD','--','apps/functions','packages/tier-locks/src','pnpm-lock.yaml','package.json','pnpm-workspace.yaml','firebase.json']]){
    try{git(root,cmd)}catch{throw new Error('Source build inputs differ from reviewed commit')}
  }
  const untracked=git(root,['ls-files','--others','--exclude-standard','--','apps/functions/src','packages/tier-locks/src'])
  if(untracked)throw new Error('Untracked TypeScript source could enter Functions build')
  const refs=[]
  for(const [path,type] of inputPaths){
    const sha=git(root,['rev-parse',`HEAD:${path}`]);
    if(!sha40.test(sha)||git(root,['cat-file','-t',sha])!==type)throw new Error(`Invalid Git input object: ${path}`)
    refs.push({path,type,sha})
  }
  const sourceDigest=hash(JSON.stringify(refs))
  const outputRoot=join(root,'apps/functions/lib')
  const files=collect(outputRoot)
  if(!files.length||!files.find(x=>x.path==='apps/functions/src/index.js'))throw new Error('Compiled Functions entrypoint missing')
  const compiledDigest=hash(JSON.stringify(files))
  if(Number(process.versions.node.split('.')[0])!==22)throw new Error('Functions attestation requires Node 22')
  return {schemaVersion:'urai-r883-functions-build-evidence-1',repository:'LifeLoggerAI/urai-spatial',project:'urai-4dc1d',releaseSha:head,workflowRunId:String(runId),nodeVersion:process.version,
    buildInputs:refs,buildInputsSha256:sourceDigest,compiledOutputDigestSha256:compiledDigest,
    compiledFileCount:files.length,compiledTotalBytes:files.reduce((n,x)=>n+x.bytes,0),compiledFiles:files,
    buildRoot:'apps/functions/lib',providerReadback:false,productionCertified:false}
}
export function attestFunctionsBuild({repoRoot,expectedSha,runId,manifestPath}){
  const record=context(repoRoot,expectedSha,runId)
  if(!manifestPath||existsSync(manifestPath))throw new Error('New evidence manifest path required; refusing overwrite')
  writeFileSync(manifestPath,JSON.stringify(record,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'})
  return {pass:true,releaseSha:record.releaseSha,buildInputsSha256:record.buildInputsSha256,compiledOutputDigestSha256:record.compiledOutputDigestSha256,compiledFileCount:record.compiledFileCount,providerReadback:false}
}
export function verifyFunctionsBuild({repoRoot,expectedSha,runId,manifestPath}){
  if(!manifestPath)throw new Error('Evidence manifest required')
  const st=lstatSync(manifestPath)
  if(!st.isFile()||st.isSymbolicLink())throw new Error('Evidence manifest must be regular file')
  const prior=JSON.parse(readFileSync(manifestPath,'utf8'))
  const current=context(repoRoot,expectedSha,runId)
  if(JSON.stringify(prior)!==JSON.stringify(current))throw new Error('Functions build inputs or compiled bytes differ from attested manifest')
  return {pass:true,releaseSha:current.releaseSha,buildInputsSha256:current.buildInputsSha256,compiledOutputDigestSha256:current.compiledOutputDigestSha256,compiledFileCount:current.compiledFileCount,providerReadback:false}
}
function argsToOptions(argv){
  const o={};for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||!argv[i+1])throw new Error('Use --flag value arguments');const k=argv[i].slice(2);if(o[k]!==undefined)throw new Error(`Repeated ${k}`);o[k]=argv[i+1]}
  for(const k of Object.keys(o))if(!['mode','repo-root','release-sha','run-id','manifest'].includes(k))throw new Error(`Unknown argument ${k}`)
  return o
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const o=argsToOptions(process.argv.slice(2));const opts={repoRoot:o['repo-root']||'.',expectedSha:o['release-sha'],runId:o['run-id'],manifestPath:o.manifest};const r=o.mode==='attest'?attestFunctionsBuild(opts):o.mode==='verify'?verifyFunctionsBuild(opts):(()=>{throw new Error('Mode must be attest or verify')})();process.stdout.write(JSON.stringify(r,null,2)+'\n')}
  catch(e){process.stderr.write(`R883 HOLD - Functions build evidence refused: ${e instanceof Error?e.message:String(e)}\n`);process.exitCode=1}
}
