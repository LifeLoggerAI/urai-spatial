import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { MEMORY_WORLD_BLOCKOUT_PRESETS, blockoutPresetForWorld } from '../src/spatial/memory-world/blockoutPresets.ts'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'
import { buildBoundedTemplateMemoryWorld } from '../src/spatial/memory-world/templateWorld.ts'

test('first production visual set exists as fifteen explicit BLOCKOUT presets and none is mislabeled Gold', () => {
  assert.equal(MEMORY_WORLD_BLOCKOUT_PRESETS.length,15)
  for(const preset of MEMORY_WORLD_BLOCKOUT_PRESETS){
    assert.equal(preset.status,'blockout')
    assert.ok(preset.props.length>=3)
    assert.ok(preset.props.every((prop)=>prop.semanticTag.includes(':')))
  }
})

test('era-aware living-room and kitchen blockouts select decade-specific layouts', () => {
  const base=buildNamedExplicitDemoMemory('demo:era')
  const oldMemory={...base,occurredAt:'1997-12-25T12:00:00.000Z',title:'Family kitchen',place:{label:'Kitchen'}}
  const oldWorld=buildBoundedTemplateMemoryWorld(oldMemory)
  assert.equal(oldWorld.context.eraPackId,'era:1990s')
  assert.equal(blockoutPresetForWorld(oldWorld)?.id,'blockout:1990s-kitchen')

  const modern={...base,occurredAt:'2026-01-01T12:00:00.000Z',title:'Living room',place:{label:'Living room'}}
  const modernWorld=buildBoundedTemplateMemoryWorld(modern)
  assert.equal(blockoutPresetForWorld(modernWorld)?.id,'blockout:modern-living-room')
})

test('runtime exposes semantic anchors and blockout maturity instead of generic unlabeled geometry', () => {
  const runtime=fs.readFileSync(new URL('../src/spatial/memory-world/MemoryWorldRuntime.tsx',import.meta.url),'utf8')
  assert.match(runtime,/blockoutPresetForWorld/)
  assert.match(runtime,/semanticTag: prop\.semanticTag/)
  assert.match(runtime,/maturity: 'blockout'/)
  assert.doesNotMatch(runtime,/maturity: 'gold'/)
})
