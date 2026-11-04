'use strict'
/**
 * R529: connected server-created Life Movie -> client Firestore Rules ->
 * realtime revocation notice, against ONE disposable Firestore datastore.
 *
 * Test authentication contexts are synthetic Firebase Rules Unit Testing
 * credentials, NOT production Auth ID tokens, App Check or signed service IAM.
 * Never run without the loopback Firestore emulator and demo project.
 * File name intentionally avoids *.test.js for the regular native suite.
 */
const assert = require('node:assert/strict')
const {readFileSync} = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const {test, before, after} = require('node:test')
const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing')
const {doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot} = require('firebase/firestore')

const project = 'demo-urai-spatial-r529-life-movie-client'
const host = process.env.FIRESTORE_EMULATOR_HOST
assert.equal(process.env.URAI_R529_EMULATOR_PROOF, '1')
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.match(host || '', /^127[.]0[.]0[.]1:[0-9]+$/)
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined)
assert.equal(process.env.FIREBASE_TOKEN, undefined)
if(process.env.GOOGLE_CLOUD_PROJECT) assert.equal(process.env.GOOGLE_CLOUD_PROJECT, project)

const app = admin.initializeApp({projectId:project}, 'urai-r529-synthetic-server')
const db = admin.firestore(app)
db.settings({host,ssl:false})
const rules = readFileSync(path.resolve(__dirname,'../../../firebase/firestore.rules'), 'utf8')
const compiledFile = path.resolve(__dirname,'../lib/apps/functions/src/lifeMovie.js')
const compiled = readFileSync(compiledFile,'utf8')
const wrapper = vm.runInThisContext(
  '(function(exports, require, module, __filename, __dirname) {\n' + compiled + '\n})',
  {filename:compiledFile}
)
const server = {exports:{}}
const firestoreFacade = Object.assign(() => db, {FieldValue:admin.firestore.FieldValue})
wrapper(server.exports, name => {
  if (name === 'firebase-admin') return {
    apps:[app], firestore:firestoreFacade,
    initializeApp(){throw Error('R529 must not initialize a second SDK app')}
  }
  if (name === 'firebase-functions/v1') return functions
  throw Error('R529 unexpected callable dependency ' + name)
},server,compiledFile,path.dirname(compiledFile))
const upsert = server.exports.upsertLifeMovieManifest.run
const revoke = server.exports.revokeLifeMovieManifest.run
assert.equal(typeof upsert,'function')
assert.equal(typeof revoke,'function')

const ownerId = 'synthetic-r529-owner'
const otherId = 'synthetic-r529-foreign'
const adminId = 'synthetic-r529-admin-claim'
const moviePath = 'users/' + ownerId + '/lifeMovies/movie-1'
const memoryPath = 'users/' + ownerId + '/memories/memory-1'
const auth = {auth:{uid:ownerId}}
const input = {
  movieId:'movie-1', status:'draft',
  chapters:[{id:'chapter-1',memoryId:'memory-1',order:0}],
}
let env

async function timeout(promise,label,ms=10000){
  let timer
  try {
    return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('R529 timed out: '+label)),ms)
    })])
  } finally {clearTimeout(timer)}
}
before(async()=>{
  env=await initializeTestEnvironment({projectId:project,firestore:{rules}})
  await db.doc(memoryPath).set({
    ownerId,consentState:'authorized',deleted:false,
    label:'Synthetic private test memory, not a customer recording',
  })
  const created=await upsert(input,auth)
  assert.equal(created.movieId,'movie-1')
})
after(async()=>{
  if(env) await env.cleanup()
  await db.terminate()
  await app.delete()
})
test('original callable-created movie is owner-only and cannot be forged by clients',async()=>{
  const own=env.authenticatedContext(ownerId).firestore()
  const foreign=env.authenticatedContext(otherId).firestore()
  const adminClaim=env.authenticatedContext(adminId,{admin:true}).firestore()
  const anonymous=env.unauthenticatedContext().firestore()
  const ownerMovie=doc(own,moviePath)
  const ownerMemory=doc(own,memoryPath)

  const result=await assertSucceeds(getDoc(ownerMovie))
  assert.equal(result.data()?.consentState,'authorized')
  assert.equal(result.data()?.ownerId,ownerId)
  await assertSucceeds(getDoc(ownerMemory))

  for(const other of [foreign,adminClaim,anonymous]){
    await assertFails(getDoc(doc(other,moviePath)))
    await assertFails(getDoc(doc(other,memoryPath)))
  }
  for(const client of [own,foreign,adminClaim,anonymous]){
    await assertFails(setDoc(doc(client,moviePath),{
      ownerId,consentState:'authorized',status:'ready',version:999,
      forgedApproved:true,
    }))
    await assertFails(updateDoc(doc(client,moviePath),{
      consentState:'authorized',status:'ready',forgedApproved:true,
    }))
    await assertFails(deleteDoc(doc(client,moviePath)))
    await assertFails(setDoc(doc(client,'users/'+ownerId+'/lifeMovies/client-forged'),{
      ownerId,consentState:'authorized',status:'ready',
    }))
  }
  assert.equal((await db.doc(moviePath).get()).get('version'),1)
  console.log('R529_REAL_RULES_CASE_PASS owner-only server-manifest read and zero client writes')
})
test('owner SDK realtime listener sees server revocation; outsiders cannot revive it',async()=>{
  const own=env.authenticatedContext(ownerId).firestore()
  const foreign=env.authenticatedContext(otherId).firestore()
  const ownerMovie=doc(own,moviePath)
  const seen=[]
  let waitForSignal=()=>{}
  let rejectForSignal=()=>{}
  const observation=new Promise((resolve,reject)=>{
    waitForSignal=resolve
    rejectForSignal=reject
  })
  let activeUnsubscribe=()=>{}
  try {
    activeUnsubscribe=onSnapshot(ownerMovie,snap=>{
      const state=snap.data()?.consentState
      if(state) seen.push(state)
      if(state==='revoked') waitForSignal()
    },err=>rejectForSignal(err))
    // Verify that a real owner subscription has read the old granted state
    // before the server revokes it. Do not assume delivery ordering by sleep.
    await timeout(new Promise((resolve,reject)=>{
      const probe=setInterval(()=>{
        if(seen.includes('authorized')) {clearInterval(probe);resolve()}
      },15)
      setTimeout(()=>{
        clearInterval(probe)
        reject(Error('R529 authorized snapshot not received'))
      },5000)
    }),'authorized snapshot')
    const result=await revoke({movieId:'movie-1'},auth)
    assert.deepEqual(result,{movieId:'movie-1',revoked:true})
    await timeout(observation,'revoked snapshot')
    assert.ok(seen.includes('authorized') && seen.includes('revoked'))
    assert.equal(seen.at(-1),'revoked')
    assert.equal((await assertSucceeds(getDoc(ownerMovie))).data()?.consentState,'revoked')
    await assertFails(getDoc(doc(foreign,moviePath)))
    await assertFails(updateDoc(ownerMovie,{consentState:'authorized',status:'ready'}))
    const audits=await db.collection('users/'+ownerId+'/privacyAudit').get()
    assert.equal(audits.size,2,'upsert and revoke each emit atomic private audit')
    assert.equal((await db.doc(moviePath).get()).get('consentState'),'revoked')
    console.log('R529_REAL_RULES_CASE_PASS owner realtime revocation and tombstone protected')
  } finally {activeUnsubscribe()}
})
