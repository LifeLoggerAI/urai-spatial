#!/usr/bin/env node
// Capture the *local* Firebase CLI v15.22.3 Gen-2 source ZIP using its own
// preparer. This invokes no Firebase deploy/upload and makes no cloud claims.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fail = code => { throw new Error(`URAI_OFFLINE_PACKAGE_${code}`) }

export async function captureFirebaseSourcePackage({repoRoot, cliRoot, archivePath, receiptPath, exactSha}) {
  if (!/^[a-f0-9]{40}$/.test(exactSha ?? '')) fail('SOURCE_SHA_INVALID')
  const root=fs.realpathSync(repoRoot), cli=fs.realpathSync(cliRoot)
  const source=path.join(root,'apps/functions')
  if (!fs.statSync(source).isDirectory()) fail('FUNCTIONS_SOURCE_MISSING')
  const output=path.resolve(archivePath), receipt=path.resolve(receiptPath)
  if (!output.endsWith('.zip') || output.startsWith(source+path.sep) || receipt.startsWith(source+path.sep) || output===receipt) fail('OUTPUT_BOUNDARY_INVALID')
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',timeout:15000}).trim()
  if(git('rev-parse','HEAD')!==exactSha || git('status','--porcelain','--untracked-files=no')) fail('DIRTY_OR_WRONG_CHECKOUT')
  const remote=git('remote','get-url','origin')
  if(!['https://github.com/LifeLoggerAI/urai-spatial','https://github.com/LifeLoggerAI/urai-spatial.git'].includes(remote)) fail('WRONG_REPOSITORY')
  const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).functions
  if(!config || config.source!=='apps/functions' || config.runtime!=='nodejs22' || config.codebase!=='urai-spatial-functions' || config.ignore!==undefined) fail('FUNCTIONS_CONFIG_DRIFT')
  const pkgRoot=path.join(cli,'node_modules/firebase-tools')
  const packageMeta=JSON.parse(fs.readFileSync(path.join(pkgRoot,'package.json'),'utf8'))
  if(packageMeta.version!=='15.22.3') fail('FIREBASE_CLI_VERSION_MISMATCH')
  const require=createRequire(import.meta.url)
  const native=path.join(pkgRoot,'lib/deploy/functions/prepareFunctionsUpload.js')
  if(!fs.statSync(native).isFile()) fail('NATIVE_PREPARER_MISSING')
  const {prepareFunctionsUpload}=require(native)
  if(typeof prepareFunctionsUpload!=='function') fail('NATIVE_PREPARER_MISSING')
  // Gen-2 GCF (platform gcfv2, not platform run) passes undefined runtime
  // config and explicitly requests zip in Firebase CLI 15.22.3 prepare.ts.
  const built=await prepareFunctionsUpload(root,source,
    {...config,ignore:['node_modules','.git']},[],undefined,{exportType:'zip',executablePaths:[]})
  if(!built || typeof built.pathToSource!=='string' || !built.pathToSource.endsWith('.zip')) fail('NATIVE_ARCHIVE_UNAVAILABLE')
  const tmp=fs.realpathSync(built.pathToSource)
  if(!fs.statSync(tmp).isFile()) fail('NATIVE_ARCHIVE_NONREGULAR')
  fs.mkdirSync(path.dirname(output),{recursive:true})
  fs.copyFileSync(tmp,output)
  const bytes=fs.readFileSync(output)
  if(bytes.length===0 || bytes.length>128*1024*1024) fail('NATIVE_ARCHIVE_SIZE_INVALID')
  const result={
    schema:'urai-offline-firebase-cli-source-package-1',
    classification:'LOCAL_FIREBASE_CLI_15_22_3_ZIP_BYTES_ONLY',
    sourceSha:exactSha,functionsTreeSha:git('rev-parse','HEAD:apps/functions'),
    firebaseCliVersion:packageMeta.version,sourceDir:'apps/functions',exportType:'zip',
    nativePackager:'firebase-tools/lib/deploy/functions/prepareFunctionsUpload.js',
    nativeSourceHash:built.hash ?? null,archiveSha256:sha256(bytes),archiveSize:bytes.length,
    trustedCloudUploadVerified:false,cloudStorageGenerationVerified:false,
    cloudBuildSourceVerified:false,cloudRunRevisionVerified:false,
    stagingMediaAccepted:false,releaseCertified:false,
  }
  fs.mkdirSync(path.dirname(receipt),{recursive:true})
  fs.writeFileSync(receipt,JSON.stringify(result,null,2)+'\n')
  return result
}

async function main(){
 const opts={}
 for(let i=2;i<process.argv.length;i+=2){
  const k=process.argv[i],v=process.argv[i+1]
  const names={'--repo-root':'repoRoot','--cli-root':'cliRoot','--archive':'archivePath','--receipt':'receiptPath','--expected-sha':'exactSha'}
  if(!names[k] || !v || opts[names[k]]!==undefined) fail('ARGUMENT_INVALID')
  opts[names[k]]=v
 }
 if(Object.keys(opts).length!==5) fail('ARGUMENT_REQUIRED')
 console.log(JSON.stringify(await captureFirebaseSourcePackage(opts)))
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(err=>{console.error(err.message);process.exitCode=1})
}
