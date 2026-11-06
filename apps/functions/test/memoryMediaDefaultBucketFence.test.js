'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = readFileSync(join(__dirname, '../src/memoryMediaProjectBoundary.ts'), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022} }).outputText
const mod = { exports:{} }
vm.runInNewContext(javascript, { module:mod, exports:mod.exports, Object, JSON, Error }, {filename:'memoryMediaProjectBoundary.ts'})
const resolve = mod.exports.resolveMemoryMediaProject
const productionProject = 'urai-4dc1d'
const production = { GCLOUD_PROJECT: productionProject }
const demoProject = 'demo-memory-media-playback'
const demo = { GCLOUD_PROJECT: demoProject, FUNCTIONS_EMULATOR:'true' }
const productionAppspot = productionProject + '.appspot.com'
const productionFirebaseStorage = productionProject + '.firebasestorage.app'
const demoBucket = demoProject + '.firebasestorage.app'
const config = (projectId, storageBucket) => JSON.stringify({ projectId, storageBucket })
const deny = env => assert.throws(() => resolve(env), /MEMORY_MEDIA_PROJECT_UNBOUND/)

test('production refuses FIREBASE_CONFIG default bucket pointing to another project', () => {
  deny({...production, FIREBASE_CONFIG:config(productionProject,'foreign-private-bucket.appspot.com')})
})
test('production refuses an external FIREBASE_STORAGE_BUCKET default override', () => {
  deny({...production, FIREBASE_STORAGE_BUCKET:'foreign-private-bucket.firebasestorage.app'})
})
test('production refuses conflicting but individually canonical bucket names', () => {
  deny({...production, FIREBASE_CONFIG:config(productionProject,productionAppspot), FIREBASE_STORAGE_BUCKET:productionFirebaseStorage})
})
test('demo emulator refuses FIREBASE_CONFIG pointing at production storage', () => {
  deny({...demo, FIREBASE_CONFIG:config(demoProject,productionAppspot)})
})
test('demo emulator refuses explicit production STORAGE_BUCKET override', () => {
  deny({...demo, FIREBASE_STORAGE_BUCKET:productionFirebaseStorage})
})
test('valid matching default buckets stay allowed for production and fictional emulator', () => {
  for (const bucket of [productionAppspot,productionFirebaseStorage]) {
    assert.equal(resolve({...production, FIREBASE_CONFIG:config(productionProject,bucket), FIREBASE_STORAGE_BUCKET:bucket}),productionProject)
  }
  assert.equal(resolve({...demo,FIREBASE_CONFIG:config(demoProject,demoBucket),FIREBASE_STORAGE_BUCKET:demoBucket}),demoProject)
  assert.equal(resolve(production),productionProject)
  assert.equal(resolve(demo),demoProject)
})
