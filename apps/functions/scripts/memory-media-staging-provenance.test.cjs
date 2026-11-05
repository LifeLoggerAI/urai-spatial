'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {requireSupportedSourceProvenance}=require('./memory-media-staging-provenance.cjs')
const git='https://github.com/LifeLoggerAI/urai-spatial.git'
const sha='a'.repeat(40)
const f=()=>({buildConfig:{}})
const b=()=>({source:{gitSource:{url:git,revision:sha}},
  sourceProvenance:{resolvedGitSource:{url:git,revision:sha}}})
const archive={bucket:'gcf-v2-sources-fixture',object:'functions-source.zip',generation:'12345'}
const throws=(fn,reason)=>assert.throws(fn,new RegExp('STAGING_DEPLOYED_SOURCE_UNVERIFIED:'+reason))
test('fictional direct Git build can proceed to later independent checks',()=>{
 assert.equal(requireSupportedSourceProvenance(f(),b()),undefined)
})
test('any archive source blocks direct Git acceptance',()=>{
 for(const location of ['functionInput','functionResolved','buildInput','buildResolved']){
  const fn=f(),build=b()
  if(location==='functionInput')fn.buildConfig.source={storageSource:archive}
  if(location==='functionResolved')fn.buildConfig.sourceProvenance={resolvedStorageSource:archive}
  if(location==='buildInput')build.source.storageSource=archive
  if(location==='buildResolved')build.sourceProvenance.resolvedStorageSource=archive
  throws(()=>requireSupportedSourceProvenance(fn,build),'SOURCE_ARCHIVE_UNATTESTED')
 }
})
test('mismatched archive identity or generation is a contradiction',()=>{
 for(const change of [{generation:'999'},{bucket:'other-bucket'},{object:'alternate.zip'},
  {generation:undefined}]){
   const fn=f(),build=b()
   fn.buildConfig.sourceProvenance={resolvedStorageSource:{...archive}}
   build.sourceProvenance.resolvedStorageSource={...archive,...change}
   throws(()=>requireSupportedSourceProvenance(fn,build),'SOURCE_ARCHIVE_CONFLICT')
 }
})
test('unsupported repo and source-manifest origins cannot borrow a Git claim',()=>{
 for(const kind of ['repoSource','storageSourceManifest','connectedRepository','developerConnectConfig']){
  const fn=f(),build=b()
  build.source[kind]={repository:'unverified'}
  throws(()=>requireSupportedSourceProvenance(fn,build),'SOURCE_ORIGIN_UNSUPPORTED')
 }
})
test('missing Git source or missing resolved Git identity denies',()=>{
 const a=b();delete a.source.gitSource
 throws(()=>requireSupportedSourceProvenance(f(),a),'DIRECT_GIT_SOURCE_INCOMPLETE')
 const c=b();delete c.sourceProvenance.resolvedGitSource
 throws(()=>requireSupportedSourceProvenance(f(),c),'DIRECT_GIT_SOURCE_INCOMPLETE')
})
