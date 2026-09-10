import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');

assert.ok(source.includes('const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";'), 'Life Map must retain the governed memory-star GLB as hidden source and animation authority');
assert.ok(source.includes('<primitive object={hiddenAsset} visible={false} />'), 'The rejected authored memory-star presentation must remain wholly hidden');
assert.ok(source.includes('function smoothMemoryGeometry('), 'V226 must render suspended smooth organic memories instead of the rejected presentation');
assert.ok(source.includes('name={`life-map-smooth-memory-star-${siteKey}`}'), 'V226 smooth memories must remain individually addressable in the spatial scene');
assert.ok(source.includes('// V226 literal-pixel authority: a suspended living memory galaxy with no heightfield, slabs, shards, or mineral presentation.'), 'The active Life Map source must declare the V226 presentation boundary');
assert.ok(!/function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/.test(source), 'Rejected grounded strata and shard-like memory presentations must not re-enter runtime');

console.log('Life Map memory-star presentation contract passed');
