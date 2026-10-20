import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { enforceStaticLaunchBoundary } from '../scripts/enforce-static-launch-boundary.mjs'

const proof={service:'urai-spatial-deploy-proof',repository:'LifeLoggerAI/urai-spatial',
  deploymentFreshness:{commitSha:'a'.repeat(40)},
  conditionalRoutes:[
    {route:'/xr',enabled:false,expectedStatus:404,previewOnly:false},
    {route:'/spatial/ar-vr',enabled:false,expectedStatus:200,previewOnly:true},
  ],
}
const preview='<main data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled"><h1>URAI AR / VR / XR entry chamber</h1>Live WebXR headset sessions remain disabled</main>'
function fixture(body=preview) {
  const root=mkdtempSync(path.join(tmpdir(),'urai-xr-static-'))
  mkdirSync(path.join(root,'api/system'),{recursive:true})
  mkdirSync(path.join(root,'xr'),{recursive:true})
  mkdirSync(path.join(root,'spatial/ar-vr'),{recursive:true})
  writeFileSync(path.join(root,'api/system/deploy-proof'),JSON.stringify(proof))
  writeFileSync(path.join(root,'xr/index.html'),'Immersive unavailable')
  writeFileSync(path.join(root,'spatial/ar-vr/index.html'),body)
  return root
}
test('disabled headset output is removed but genuine XR preview remains',()=>{
  const root=fixture()
  try {
    const receipt=enforceStaticLaunchBoundary(root)
    assert.equal(existsSync(path.join(root,'xr/index.html')),false)
    assert.equal(existsSync(path.join(root,'spatial/ar-vr/index.html')),true)
    assert.equal(receipt.routes[0].artifactsRemoved.length,1)
    assert.equal(receipt.routes[1].artifactsRemoved.length,0)
    assert.equal(JSON.parse(readFileSync(path.join(root,'static-launch-boundary.json'),'utf8')).deviceAcceptance,false)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('generic HTML or directory listing cannot certify spatial preview',()=>{
  for(const body of ['<title>Directory listing for /spatial/ar-vr</title>',preview.replace('disabled','enabled')]){
    const root=fixture(body)
    try{assert.throws(()=>enforceStaticLaunchBoundary(root),/preview HTML markers/)}
    finally{rmSync(root,{recursive:true,force:true})}
  }
})
test('missing exported XR preview fails instead of accepting empty directory',()=>{
  const root=fixture()
  try{
    rmSync(path.join(root,'spatial/ar-vr/index.html'))
    assert.throws(()=>enforceStaticLaunchBoundary(root),/must be a rendered page/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('unsafe symlink cannot escape export confinement',()=>{
  const root=fixture()
  try{
    rmSync(path.join(root,'xr/index.html'))
    rmSync(path.join(root,'xr'),{recursive:true})
    symlinkSync(tmpdir(),path.join(root,'xr'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(()=>enforceStaticLaunchBoundary(root),/symlink/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
