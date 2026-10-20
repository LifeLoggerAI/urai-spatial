'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const src = fs.readFileSync(path.resolve(__dirname, '../src/memoryMediaProjectBoundary.ts'),'utf8')
const js = ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod = {exports:{}}
vm.runInNewContext(js,{module:mod,exports:mod.exports,Object,JSON,Error},{filename:'memoryMediaProjectBoundary.ts'})
const resolve = mod.exports.resolveMemoryMediaProject
const production={GCLOUD_PROJECT:'urai-4dc1d'}
const demo={GCLOUD_PROJECT:'demo-memory-media-playback',FUNCTIONS_EMULATOR:'true'}
const project='urai-media-staging',bucket=project+'.firebasestorage.app'
const staging={GCLOUD_PROJECT:project,GCP_PROJECT:project,GOOGLE_CLOUD_PROJECT:project,
 URAI_MEDIA_STAGING_ENABLE:'EXPLICIT_NONPRODUCTION_ONLY',
 URAI_MEDIA_STAGING_PROJECT:project,URAI_MEDIA_STAGING_BUCKET:bucket,
 FIREBASE_STORAGE_BUCKET:bucket,
 FIREBASE_CONFIG:JSON.stringify({projectId:project,storageBucket:bucket})}
const registry={ [project]:bucket }
const refuses=(env,allowed)=>assert.throws(()=>resolve(env,allowed),/MEMORY_MEDIA_PROJECT_UNBOUND/)
test('original production and explicit fictional emulators retain exact bindings',()=>{
 assert.equal(resolve(production),'urai-4dc1d')
 assert.equal(resolve(demo),'demo-memory-media-playback')
 refuses({...production,URAI_MEDIA_STAGING_ENABLE:'EXPLICIT_NONPRODUCTION_ONLY'})
 refuses({...production,FUNCTIONS_EMULATOR:'true'})
 refuses({...production,GCP_PROJECT:'urai-media-staging'})
 refuses({...demo,URAI_MEDIA_STAGING_PROJECT:project})
 refuses({...demo,GCLOUD_PROJECT:project})
})
test('positive real staging requires separately approved source mapping and matching runtime',()=>{
 refuses(staging)
 assert.equal(resolve(staging,registry),project)
 refuses({...staging,URAI_MEDIA_STAGING_ENABLE:'true'})
 refuses({...staging,URAI_MEDIA_STAGING_PROJECT:'urai-other-staging'})
 refuses({...staging,GCP_PROJECT:'urai-other-staging'})
 refuses({...staging,GOOGLE_CLOUD_PROJECT:'urai-other-staging'})
 refuses({...staging,FIREBASE_STORAGE_BUCKET:project+'.appspot.com'})
 refuses({...staging,FIREBASE_CONFIG:JSON.stringify({projectId:project,storageBucket:'some-other.appspot.com'})})
 refuses({...staging,FIREBASE_CONFIG:'{}'})
 refuses({...staging,FIREBASE_CONFIG:undefined})
 refuses({...staging,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'})
 refuses({...staging,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'})
 refuses({...staging,FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'})
 refuses({...staging,FUNCTIONS_EMULATOR:'true'})
 refuses(staging,{[project]:project+'.appspot.com'})
})
test('unknown, lookalike and production-like projects are denied even with opt-in',()=>{
 for(const id of ['urai-4dc1d','urai-media-production','urai-media-prod-staging',
 'urai-media-live-staging','urai-media-staging-extra-invalid','urai-notstaging','demo-media-staging','urai--staging']){
  const b=id+'.firebasestorage.app'
  const env={...staging,GCLOUD_PROJECT:id,GCP_PROJECT:id,GOOGLE_CLOUD_PROJECT:id,
   URAI_MEDIA_STAGING_PROJECT:id,URAI_MEDIA_STAGING_BUCKET:b,FIREBASE_STORAGE_BUCKET:b,
   FIREBASE_CONFIG:JSON.stringify({projectId:id,storageBucket:b})}
  refuses(env,{[id]:b})
 }
})
