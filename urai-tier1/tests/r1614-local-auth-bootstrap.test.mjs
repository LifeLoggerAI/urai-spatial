import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'
const root=path.resolve(import.meta.dirname,'../src')
const consumers=[
 'spatial/world/WorldTransitionController.tsx',
 'spatial/world/LifeMapRouteTransactionBridge.tsx',
 'app/replay/ReplayProductControls.tsx',
 'spatial/memory/useSelectedMemory.ts',
]
test('auth-sensitive scene entry uses canonical Firebase emulator-first initializer',()=>{
 for(const name of consumers){
  const source=fs.readFileSync(path.join(root,name),'utf8')
  assert.match(source,/getUrAiAuth\(\)/,name)
  assert.doesNotMatch(source,/getAuth\(app\)/,name)
 }
 const firebase=fs.readFileSync(path.join(root,'lib/firebase/client.ts'),'utf8')
 assert.match(firebase,/disposableFirebaseReviewAuthorized\(\)/)
 assert.match(firebase,/connectAuthEmulator\(auth,/)
 assert.match(firebase,/connectFirestoreEmulator\(db,/)
})
