import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = process.cwd()
const realmPath = path.join(root, 'src/spatial/council/CouncilRealm.tsx')
const source = fs.readFileSync(realmPath, 'utf8')

const requiredModels = [
  'council-guide-human-rigged-v3.glb',
  'council-archivist-human-rigged-v3.glb',
  'council-guardian-human-rigged-v3.glb',
]

test('Council uses committed skinned V3 human models', () => {
  for (const filename of requiredModels) {
    assert.match(source, new RegExp(filename.replaceAll('.', '\\.')))
    const asset = path.join(root, 'public/assets/urai/generated/human-rig-v3', filename)
    assert.ok(fs.existsSync(asset), `${filename} must exist as a committed runtime GLB`)
    assert.ok(fs.statSync(asset).size > 1_000_000, `${filename} must be a real binary model, not a placeholder`)
  }
  assert.match(source, /useAnimations\(/)
  assert.match(source, /idle_breath/)
  assert.match(source, /listen_acknowledge/)
  assert.match(source, /skinned-animated-human-v3/)
})

test('Council keeps physical lighting and shadow response', () => {
  assert.match(source, /<Canvas shadows/)
  assert.match(source, /castShadow/)
  assert.match(source, /receiveShadow/)
  assert.match(source, /shadow-mapSize-width=\{2048\}/)
  assert.match(source, /<directionalLight/)
  assert.match(source, /<pointLight/)
  assert.match(source, /<Environment preset="apartment"/)
  assert.match(source, /<ContactShadows/)
  assert.match(source, /physical-pbr-v1/)
})
