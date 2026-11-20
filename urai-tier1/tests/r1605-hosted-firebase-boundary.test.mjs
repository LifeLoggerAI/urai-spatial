import test from 'node:test'
import assert from 'node:assert/strict'
import {assertReviewFirebaseBoundary as gate} from '../scripts/verify-hosted-firebase-review.mjs'
const base={URAI_REVIEW_ONLY:'true',URAI_PRIVATE_MEMORY_WRITES_ENABLED:'false'}
const id='urai-security-canary-r1128'
const good={...base,NEXT_PUBLIC_FIREBASE_API_KEY:'synthetic',NEXT_PUBLIC_FIREBASE_PROJECT_ID:id,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:id+'.firebaseapp.com',NEXT_PUBLIC_FIREBASE_APP_ID:'synthetic',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:id+'.firebasestorage.app',URAI_APPROVED_STAGING_FIREBASE_PROJECT_ID:id,URAI_APPROVED_STAGING_FIREBASE_AUTH_DOMAIN:id+'.firebaseapp.com'}
const fails=(e,msg)=>assert.throws(()=>gate(e),x=>x.message===msg)
test('read-only no-Firebase allowed',()=>assert.equal(gate(base),'review-no-firebase'))
test('writes disabled required',()=>{fails({...base,URAI_PRIVATE_MEMORY_WRITES_ENABLED:'true'},'URAI_REVIEW_WRITES_MUST_BE_OFF');fails({URAI_REVIEW_ONLY:'true'},'URAI_REVIEW_WRITES_MUST_BE_OFF')})
test('partial config denied',()=>fails({...base,NEXT_PUBLIC_FIREBASE_API_KEY:'synthetic'},'URAI_REVIEW_PARTIAL_FIREBASE_CONFIG'))
test('known production project denied',()=>fails({...good,NEXT_PUBLIC_FIREBASE_PROJECT_ID:'urai-4dc1d'},'URAI_REVIEW_UNSAFE_FIREBASE_PROJECT'))
test('emulator project denied',()=>fails({...good,NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-urai-native'},'URAI_REVIEW_UNSAFE_FIREBASE_PROJECT'))
test('staging allowlist required',()=>fails({...good,URAI_APPROVED_STAGING_FIREBASE_PROJECT_ID:''},'URAI_REVIEW_STAGING_PROJECT_NOT_APPROVED'))
test('wrong auth domain denied',()=>fails({...good,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'urai-4dc1d.firebaseapp.com'},'URAI_REVIEW_STAGING_AUTH_DOMAIN_MISMATCH'))
test('wrong bucket denied',()=>fails({...good,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'urai-4dc1d.appspot.com'},'URAI_REVIEW_STAGING_STORAGE_BUCKET_MISMATCH'))
test('complete synthetic identity boundary passes config-only',()=>assert.equal(gate(good),'staging-config-matched-not-certified'))
test('non-review mode untouched',()=>assert.equal(gate({URAI_REVIEW_ONLY:'false'}),'outside-review'))
