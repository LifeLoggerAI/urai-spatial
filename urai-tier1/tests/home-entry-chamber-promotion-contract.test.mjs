import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
const binary=fs.readFileSync('public/assets/urai/generated/models/home-entry-chamber-v1.glb')
const manifest=fs.readFileSync('src/spatial/assets/assetManifest.ts','utf8')
const promotion=fs.readFileSync('src/spatial/assets/assetPromotionState.ts','utf8')
const world=fs.readFileSync('src/spatial/assets/worldAssetManifest.ts','utf8')
const layer=fs.readFileSync('src/spatial/scene/SpatialWorldAssetLayer.tsx','utf8')
const receipt=JSON.parse(fs.readFileSync('../operations/assets/production-receipts/home-entry-chamber-v1.json','utf8'))
test('promotes exact reviewed Meshopt Home binary',()=>{assert.equal(binary.length,184160);assert.equal(crypto.createHash('sha256').update(binary).digest('hex'),'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529');assert.equal(receipt.compressionStatus,'meshopt');assert.equal(receipt.measured.triangleCount,12934);assert.equal(receipt.deploymentAuthorized,false);assert.equal(receipt.providerCallsForPromotion,0)})
test('uses canonical GLB without stale compact GLTF override',()=>{const s=manifest.indexOf("id: 'home-entry-chamber-model-v1'");const e=manifest.slice(s,manifest.indexOf('\n  {',s+10));assert.match(e,/status: 'ready'/);assert.match(e,/home-entry-chamber-v1\.glb/);assert.doesNotMatch(promotion,/home-entry-chamber-v1\.gltf/);assert.match(world,/slotId: 'home.overlookPlatform'[\s\S]*?status: 'ready'/)})
test('keeps Home navigation alive through governed load fallbacks',()=>{assert.match(layer,/class AssetErrorBoundary/);assert.match(layer,/home-entry-chamber-proof-fallback/);assert.match(layer,/entry-chamber-empty-fallback/);assert.match(layer,/<HomeEntryChamber position=/)})
