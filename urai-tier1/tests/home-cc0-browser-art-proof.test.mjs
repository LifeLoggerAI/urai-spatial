import assert from 'node:assert/strict'
import test from 'node:test'
import { HOME_CC0_EXPECTED, parseReviewArgs, validateReviewManifest, authorizedResource, evidenceGate, movementGate } from '../../scripts/home-cc0-browser-art-proof.mjs'
const m={schema:'urai-home-polyhaven-cc0-dev-review-1',classification:'NONPRODUCTION_CANDIDATE_UNAPPROVED',license:'CC0-1.0',releaseApproved:false,reviewApproved:false,files:HOME_CC0_EXPECTED.map(path=>({path,bytes:123,md5:'a'.repeat(32),url:'https://dl.polyhaven.org/file/ph-assets/dummy'}))}
test('strict review-only invocation and bounded localhost port',()=>{
 assert.equal(parseReviewArgs(['--acknowledge-nonproduction']).port,3107)
 for(const flags of [[],['--port=4000'],['--acknowledge-nonproduction','--port=99'],['--acknowledge-nonproduction','--port=99999'],['--acknowledge-nonproduction','--url=http://example.com']]) assert.throws(()=>parseReviewArgs(flags))
})
test('eleven authentic source paths and fail-closed publication authority',()=>{
 assert.doesNotThrow(()=>validateReviewManifest(m))
 for(const variant of [{releaseApproved:true},{reviewApproved:true},{files:m.files.slice(1)},{license:'unknown'}]) assert.throws(()=>validateReviewManifest({...m,...variant}))
})
test('asset URL maps only to pinned local preview path',()=>{
 const origin='http://127.0.0.1:3107'
 assert.equal(authorizedResource(origin+'/assets/urai/home-production/cc0-review/ground/color.jpg',origin),'ground/color.jpg')
 for(const url of ['https://example.com/assets/urai/home-production/cc0-review/ground/color.jpg',origin+'/assets/urai/home-production/cc0-review/ground/evil.jpg',origin+'/assets/urai/home-production/cc0-review/ground/color.jpg?x=1'])assert.equal(authorizedResource(url,origin),null)
})
test('browser evidence demands original Home, real binding and all source response hashes',()=>{
 const home={originalOwner:true,ready:'true',frameCount:10,gl:true,binding:'scene-bound-candidate',ground:1,paths:3,shrubs:4,yaw:.1,pitch:.2}
 const assets=HOME_CC0_EXPECTED.map(path=>({path,status:200,md5Verified:true}))
 const pixels=Buffer.alloc(5000,1)
 assert.equal(evidenceGate(home,assets,[],pixels).passed,true)
 assert.equal(evidenceGate({...home,gl:false},assets,[],pixels).passed,false)
 assert.equal(evidenceGate({...home,binding:'incomplete'},assets,[],pixels).passed,false)
 assert.equal(evidenceGate(home,assets.slice(1),[],pixels).passed,false)
 assert.equal(evidenceGate(home,assets,['WebGL compilation error'],pixels).passed,false)
 assert.equal(evidenceGate(home,assets,[],Buffer.alloc(12)).passed,false)
})
test('camera and player changes require changed real screenshot bytes',()=>{
 const a={yaw:0,pitch:0,x:0,z:0},b={yaw:0.3,pitch:0.2,x:0.2,z:-0.1}
 const p=Buffer.from('p'),q=Buffer.from('q')
 assert.equal(movementGate(a,b,p,q,'yaw'),true)
 assert.equal(movementGate(a,b,p,q,'pitch'),true)
 assert.equal(movementGate(a,b,p,q,'walk'),true)
 assert.equal(movementGate(a,b,p,p,'yaw'),false)
 assert.equal(movementGate(a,a,p,q,'yaw'),false)
})
