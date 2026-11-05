import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyRealConsumerXrExport } from '../scripts/lib/real-consumer-xr-export.mjs'
const boundary={routes:[
  {route:'/xr',enabled:false,expectedStatus:404,previewOnly:false},
  {route:'/spatial/ar-vr',enabled:false,expectedStatus:200,previewOnly:true},
]}
const authority={enabled:false,expectedStatus:404,claim:'governed-post-launch-gated'}
const preview='<main data-testid="urai-quest-explorable-world" data-immersive-session-gated="true">'+
  '<h1>URAI AR / VR / XR entry chamber</h1>'+
  '<aside data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled">'+
  'Live WebXR headset sessions remain disabled</aside>'+
  '<div data-testid="urai-quest-vr-entry-control">'+
  '<label><input type="checkbox" disabled=""/>I agree to use my headset movement and controls</label>'+
  '<button type="button" disabled="">Enter VR in Quest</button></div></main>'
function verify(html=preview,files=['spatial/ar-vr/index.html']) {
  return verifyRealConsumerXrExport({boundary,authority,files,
    readHtml:name=>{assert.equal(name,'spatial/ar-vr/index.html');return html}})
}
test('real static verifier accepts only gated disabled technical XR preview',()=>{
  const receipt=verify()
  assert.equal(receipt.immersiveRouteRemoved,true)
  assert.equal(receipt.technicalPreviewVerified,true)
  assert.equal(receipt.deviceAcceptance,false)
  assert.equal(receipt.releaseAuthorized,false)
})
test('disabled /xr HTML or RSC data cannot be retained',()=>{
  for(const file of ['xr/index.html','xr.html','xr/index.txt','xr.txt'])
    assert.throws(()=>verify(preview,[file,'spatial/ar-vr/index.html']),/disabled immersive XR route exposed/)
})
test('technical XR preview must be physically exported',()=>{
  assert.throws(()=>verify(preview,[]),/missing authorized technical preview/)
})
test('technical XR preview rejects removed or spoofed authority markers',()=>{
  for(const html of [
    preview.replace('technical-preview','live'),
    preview.replace('data-xr-immersive-authority="disabled"','data-xr-immersive-authority="enabled"'),
    preview.replace('Live WebXR headset sessions remain disabled','Live headset sessions enabled'),
    '<title>Directory listing</title>',
  ]) assert.throws(()=>verify(html),/preview identity/)
})
test('technical XR preview rejects active or missing immersive controls',()=>{
  for(const html of [
    preview.replace('data-immersive-session-gated="true"','data-immersive-session-gated="false"'),
    preview.replace('<button type="button" disabled="">','<button type="button">'),
    preview.replace('<input type="checkbox" disabled=""/>','<input type="checkbox"/>'),
    preview.replace('Enter VR in Quest','Enter a live VR session'),
  ]) assert.throws(()=>verify(html),/gated|button|consent/)
})
test('inconsistent route authority cannot be passed by safe-looking HTML',()=>{
  for(const entry of [
    {...boundary.routes[1],enabled:true,previewOnly:false},
    {...boundary.routes[1],expectedStatus:404},
    {...boundary.routes[1],previewOnly:false},
  ]) assert.throws(()=>verifyRealConsumerXrExport({boundary:{routes:[boundary.routes[0],entry]},
    authority,files:['spatial/ar-vr/index.html'],readHtml:()=>preview}),/source authority/)
})
