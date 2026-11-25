import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {captureFirebaseSourcePackage} from './prove-firebase-functions-package.mjs'

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'urai-firebase-cli-fiction-'))
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 const root=path.join(dir,'repo'), cli=path.join(dir,'cli')
 fs.mkdirSync(path.join(root,'apps/functions'),{recursive:true})
 fs.mkdirSync(path.join(cli,'node_modules/firebase-tools/lib/deploy/functions'),{recursive:true})
 const config={functions:{source:'apps/functions',runtime:'nodejs22',codebase:'urai-spatial-functions'}}
 fs.writeFileSync(path.join(root,'firebase.json'),JSON.stringify(config))
 fs.writeFileSync(path.join(root,'apps/functions/package.json'),'{}\n')
 fs.writeFileSync(path.join(cli,'node_modules/firebase-tools/package.json'),JSON.stringify({version:'15.22.3'}))
 const fakeArchive=path.join(dir,'fiction.zip')
 fs.writeFileSync(fakeArchive,Buffer.from('PK\u0003\u0004fictional-test-only'))
 fs.writeFileSync(path.join(cli,'node_modules/firebase-tools/lib/deploy/functions/prepareFunctionsUpload.js'),
  `module.exports={prepareFunctionsUpload:async()=>({pathToSource:${JSON.stringify(fakeArchive)},hash:'fictional-cache-hash'})}`)
 const git=(...args)=>execFileSync('git',['-C',root,...args],{stdio:['ignore','pipe','pipe']}).toString().trim()
 git('init');git('config','user.name','Fictional Tester');git('config','user.email','fictional@example.invalid')
 git('remote','add','origin','https://github.com/LifeLoggerAI/urai-spatial.git')
 git('add','.');git('commit','-m','fictional test')
 const exactSha=git('rev-parse','HEAD')
 const archivePath=path.join(dir,'evidence','source.zip'),receiptPath=path.join(dir,'evidence','receipt.json')
 return {root,cli,config,git,exactSha,archivePath,receiptPath,fn:()=>captureFirebaseSourcePackage({repoRoot:root,cliRoot:cli,archivePath,receiptPath,exactSha})}
}

test('fictional native packager returns bounded local classification, never cloud proof',async t=>{
 const f=fixture(t);const receipt=await f.fn()
 assert.equal(receipt.sourceSha,f.exactSha)
 assert.equal(receipt.firebaseCliVersion,'15.22.3')
 assert.equal(receipt.exportType,'zip')
 assert.match(receipt.archiveSha256,/^[a-f0-9]{64}$/)
 for(const k of ['trustedCloudUploadVerified','cloudStorageGenerationVerified','cloudBuildSourceVerified','cloudRunRevisionVerified','stagingMediaAccepted','releaseCertified'])assert.equal(receipt[k],false)
 assert.equal(JSON.parse(fs.readFileSync(f.receiptPath,'utf8')).archiveSha256,receipt.archiveSha256)
})
test('unreviewed deploy CLI version never obtains package receipt',async t=>{
 const f=fixture(t)
 fs.writeFileSync(path.join(f.cli,'node_modules/firebase-tools/package.json'),JSON.stringify({version:'15.32.1'}))
 await assert.rejects(f.fn(),/URAI_OFFLINE_PACKAGE_FIREBASE_CLI_VERSION_MISMATCH/)
})
test('wrong repository and changed exact source fail without archive output',async t=>{
 const f=fixture(t)
 f.git('remote','set-url','origin','https://github.com/not-urai/other.git')
 await assert.rejects(f.fn(),/URAI_OFFLINE_PACKAGE_WRONG_REPOSITORY/)
 assert.equal(fs.existsSync(f.archivePath),false)
})
test('modified tracked source fails before preparing archive',async t=>{
 const f=fixture(t)
 fs.writeFileSync(path.join(f.root,'firebase.json'),'{}')
 await assert.rejects(f.fn(),/URAI_OFFLINE_PACKAGE_DIRTY_OR_WRONG_CHECKOUT/)
})
test('incorrect Firebase runtime and codebase cannot use validated identity',async t=>{
 const f=fixture(t)
 const p=path.join(f.root,'firebase.json')
 fs.writeFileSync(p,JSON.stringify({functions:{source:'apps/functions',runtime:'nodejs20',codebase:'changed'}}))
 f.git('add','.');f.git('commit','-m','fixture config drift')
 const latestSha=f.git('rev-parse','HEAD')
 await assert.rejects(captureFirebaseSourcePackage({repoRoot:f.root,cliRoot:f.cli,archivePath:f.archivePath,receiptPath:f.receiptPath,exactSha:latestSha}),/URAI_OFFLINE_PACKAGE_FUNCTIONS_CONFIG_DRIFT/)
})
test('tampered output target within Functions source is denied',async t=>{
 const f=fixture(t)
 await assert.rejects(captureFirebaseSourcePackage({repoRoot:f.root,cliRoot:f.cli,archivePath:path.join(f.root,'apps/functions/unsafe.zip'),receiptPath:f.receiptPath,exactSha:f.exactSha}),/URAI_OFFLINE_PACKAGE_OUTPUT_BOUNDARY_INVALID/)
})
