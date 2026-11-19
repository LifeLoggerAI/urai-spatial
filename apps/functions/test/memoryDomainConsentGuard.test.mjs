import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, getIdTokenResult } from 'firebase/auth'
import admin from 'firebase-admin'
import { randomBytes } from 'node:crypto'
import { requireMemoryDomainProcessingConsent } from '../src/memoryDomainConsentGuard.ts'
const project='demo-urai-r1586-identity',nonce=randomBytes(7).toString('hex')
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:40542'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:40541')throw Error('REFUSE_NONLOCAL_EMULATORS')
const app=initializeApp({apiKey:'only-synthetic',projectId:project,authDomain:project+'.firebaseapp.com',appId:'synthetic'},'r1586-'+nonce)
const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:40541',{disableWarnings:true})
const adm=admin.initializeApp({projectId:project})
const db=adm.firestore(),aa=adm.auth()
const result={}
let uid,policy,tombstone
const expectDeny=async(label,ctx,expected='permission-denied')=>{
 await assert.rejects(requireMemoryDomainProcessingConsent(db,uid,ctx),error=>error.code===expected,label)
 result[label]='DENIED'
}
try {
 const signed=await createUserWithEmailAndPassword(auth,'r1586-'+nonce+'@example.invalid','LOCAL_SYNTHETIC_1234!')
 uid=signed.user.uid;const token=await getIdTokenResult(signed.user)
 const authTime=Math.floor(new Date(token.authTime).getTime()/1000)
 const ctx={auth:{uid,token:{auth_time:authTime}}}
 policy=db.doc('users/'+uid+'/privacyPolicy/current')
 tombstone=db.doc('privacyDeletionTombstones/'+uid)
 await policy.set({ownerId:uid,domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'},synthetic:true})
 await requireMemoryDomainProcessingConsent(db,uid,ctx);result['granted']='ALLOWED'
 await policy.update({'domains.memory.mode':'limited'})
 await requireMemoryDomainProcessingConsent(db,uid,ctx);result['limited']='ALLOWED'
 await policy.update({'domains.memory.mode':'denied'})
 await expectDeny('domain_denied',ctx)
 await policy.update({'domains.memory.mode':'granted'})
 await tombstone.set({active:true,synthetic:true})
 await expectDeny('active_deletion_tombstone',ctx)
 await tombstone.delete()
 await aa.updateUser(uid,{disabled:true})
 await expectDeny('disabled_account',ctx)
 await aa.updateUser(uid,{disabled:false})
 await expectDeny('invalid_auth_time',{auth:{uid,token:{auth_time:0}}},'unauthenticated')
 await expectDeny('uid_mismatch',{auth:{uid:'wrong-synthetic',token:{auth_time:authTime}}},'unauthenticated')
 await aa.revokeRefreshTokens(uid)
 const user=await aa.getUser(uid)
 const after=Math.floor(new Date(user.tokensValidAfterTime).getTime()/1000)
 assert(Number.isFinite(after))
 await expectDeny('revoked_credential',{auth:{uid,token:{auth_time:after-2}}})
 await aa.deleteUser(uid)
 await expectDeny('deleted_account',ctx)
 const movie=(await import('node:fs')).readFileSync('src/lifeMovie.ts','utf8')
 const model=(await import('node:fs')).readFileSync('src/lifeModelFunctions.ts','utf8')
 assert(movie.includes('await requireMemoryDomainProcessingConsent(db, uid, context)'), 'Life Movie processing entry must guard current account')
 assert(model.includes('await requireMemoryDomainProcessingConsent(db, uid, context)'), 'Replay model processing entry must guard current account')
 console.log('R1586_RESULT '+JSON.stringify({source:'exact PR #2158 + isolated review patch',project,synthetic:true,results:result}))
} catch(e){console.log('R1586_ERROR '+JSON.stringify({message:e.message,code:e.code,stack:e.stack?.slice(0,450)}));process.exitCode=3}
finally {if(tombstone)await tombstone.delete().catch(()=>{});if(policy)await policy.delete().catch(()=>{});await deleteApp(app);await adm.delete()}
