#!/usr/bin/env node
/**
 * R1311: real, disposable Firebase Auth + Firestore Rules owner-boundary proof.
 * This is not a first-memory creation/upload proof: canonical records are seeded
 * by Admin in the isolated emulator, never by an end user's browser.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const rootRequire = createRequire(import.meta.url)
const tier1Require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const admin = rootRequire('firebase-admin')
const { initializeApp, deleteApp } = tier1Require('firebase/app')
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = tier1Require('firebase/auth')
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc } = tier1Require('firebase/firestore')

const PROJECT='demo-urai-auth-journey'
const HOST='127.0.0.1'
const OWNER='fictional-r1311-owner'
const FOREIGN='fictional-r1311-foreign'
const MEMORY='fictional-r1311-owned-memory'
const PASSWORD='Synthetic_2026_Test_Only!'
const names={owner:'r1311-client-owner',foreign:'r1311-client-foreign'}
const required={
  GCLOUD_PROJECT:PROJECT,
  FIREBASE_AUTH_EMULATOR_HOST:HOST+':9099',
  FIRESTORE_EMULATOR_HOST:HOST+':8080',
}
for(const [key,value] of Object.entries(required))assert.equal(process.env[key],value,'R1311 local emulator authority required for '+key)
for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','RUNPOD_API_KEY','FIREBASE_TOKEN','GITHUB_TOKEN','GH_TOKEN','VERCEL_TOKEN']){
  assert.ok(!process.env[key], 'R1311 refuses inherited provider credential name '+key)
}
const hub=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(5000)})
assert.equal(hub.status,200,'R1311 requires local Firebase emulator hub')
const active=await hub.json()
for(const [service,port] of [['auth',9099],['firestore',8080]]){
  assert.ok(active[service], 'R1311 expected local '+service+' emulator')
  assert.ok([HOST,'localhost'].includes(active[service].host) && active[service].port===port,
    'R1311 emulator host/port mismatch '+service)
}
const apps=[]
let server=null
const userIds=[OWNER,FOREIGN]
const paths=[
  'users/'+OWNER+'/memories/'+MEMORY,
  'users/'+FOREIGN+'/memories/fictional-r1311-foreign-memory',
  'users/'+OWNER+'/privacyPolicy/current',
  'users/'+OWNER,
  'users/'+FOREIGN,
]
const mark=[]
const permissionDenied=async (action,name)=>{
  let denied=false
  try{await action()}catch(e){
    denied=String(e?.code??'').includes('permission-denied')
  }
  assert.equal(denied,true,'R1311 '+name+' must be denied by real Firestore Rules')
  mark.push(name+' DENIED')
}
function client(uid,label){
  const app=initializeApp({apiKey:'fictional-emulator-key',authDomain:PROJECT+'.firebaseapp.com',projectId:PROJECT},names[label])
  apps.push(app)
  const auth=getAuth(app)
  connectAuthEmulator(auth,'http://'+HOST+':9099',{disableWarnings:true})
  const db=getFirestore(app)
  connectFirestoreEmulator(db,HOST,8080)
  return {auth,db,uid}
}
const clientApps=[]
try {
  server=admin.initializeApp({projectId:PROJECT},'r1311-server')
  const users=admin.auth(server)
  const firestore=admin.firestore(server)
  for(const uid of userIds){
    await users.createUser({uid,email:uid+'@example.invalid',password:PASSWORD})
    await firestore.doc('users/'+uid).set({ownerId:uid,accountStatus:'active',deleted:false})
  }
  const memoryData={
    ownerId:OWNER,title:'Fictional R1311 Lake',summary:'Synthetic local test only',
    occurredAt:'1988-08-01T12:00:00.000Z',emotionalState:'calm',deleted:false,
    consentState:'authorized',privacy:'private',demo:false,sourceMedia:[],
    star:{id:MEMORY,position:[1,0,-4],scale:1,aura:'#8adfff'},
    replayManifest:{id:'fictional-r1311-replay',version:1,durationMs:10000,
      segments:['memory','emotion','pattern','return'].map((id,i)=>({
        id,label:id,caption:'Synthetic',narratorLine:'Synthetic',startsAtMs:i*2500,durationMs:2500,
      }))},
  }
  await firestore.doc(paths[0]).set(memoryData)
  await firestore.doc(paths[1]).set({...memoryData,ownerId:FOREIGN,title:'Foreign synthetic memory'})
  await firestore.doc(paths[2]).set({
    version:2,ownerId:OWNER,revision:1,domains:{memory:{mode:'granted',lifeMapVisible:true,replayVisible:true}},
    enforcement:{state:'fully-enforced'},
  })
  const own=client(OWNER,'owner'),other=client(FOREIGN,'foreign')
  clientApps.push(own,other)
  for(const actor of clientApps){
    const signed=await signInWithEmailAndPassword(actor.auth,actor.uid+'@example.invalid',PASSWORD)
    assert.equal(signed.user.uid,actor.uid)
  }
  mark.push('two actual Auth emulator identities PASS')
  const ownMemoryRef=doc(own.db,'users',OWNER,'memories',MEMORY)
  const foreignMemoryRef=doc(other.db,'users',OWNER,'memories',MEMORY)
  const ownMemory=await getDoc(ownMemoryRef)
  assert.equal(ownMemory.exists(),true)
  assert.equal(ownMemory.data()?.ownerId,OWNER)
  assert.equal(ownMemory.data()?.title,memoryData.title)
  mark.push('real owner SDK memory read PASS')
  const ownerPolicy=await getDoc(doc(own.db,'users',OWNER,'privacyPolicy','current'))
  assert.equal(ownerPolicy.data()?.ownerId,OWNER)
  mark.push('real owner policy read PASS')
  await permissionDenied(()=>getDoc(foreignMemoryRef),'foreign owner memory read')
  await permissionDenied(()=>getDoc(doc(other.db,'users',OWNER,'privacyPolicy','current')),'foreign owner policy read')
  await permissionDenied(()=>setDoc(ownMemoryRef,{title:'browser wrote private memory'},{merge:true}),'client owner memory update')
  await permissionDenied(()=>setDoc(doc(own.db,'users',OWNER,'memories','fictional-r1311-forged'),{ownerId:OWNER}),'client owner memory creation')
  await permissionDenied(()=>deleteDoc(ownMemoryRef),'client owner memory deletion')
  await permissionDenied(()=>setDoc(doc(own.db,'users',OWNER,'privacyPolicy','current'),{revision:999},{merge:true}),'client policy forgery')
  assert.equal((await getDoc(ownMemoryRef)).exists(),true)
  await firestore.doc(paths[0]).delete()
  assert.equal((await getDoc(ownMemoryRef)).exists(),false)
  assert.equal((await getDoc(doc(other.db,'users',FOREIGN,'memories','fictional-r1311-foreign-memory'))).exists(),true)
  mark.push('server deletion removes only owner record PASS')
  for(const line of mark)console.log('[R1311 PASS] '+line)
  console.log('[R1311] '+mark.length+' bounded milestones; full owner creation and media Replay remain untested')
}finally{
  for(const a of clientApps)await signOut(a.auth).catch(()=>{})
  for(const a of apps)await deleteApp(a).catch(()=>{})
  if(server){
    const db=admin.firestore(server)
    for(const p of paths)await db.doc(p).delete().catch(()=>{})
    for(const uid of userIds)await admin.auth(server).deleteUser(uid).catch(()=>{})
    await server.delete().catch(()=>{})
  }
}
