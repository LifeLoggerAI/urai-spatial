import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');

assert.ok(source.includes('const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";'), 'Life Map must retain the governed memory-star GLB as hidden source and animation authority');
assert.ok(source.includes('<primitive object={hiddenAsset} visible={false} />'), 'The rejected authored memory-star presentation must remain wholly hidden');
assert.ok(source.includes('function memoryHeartGeometry('), 'Life Map must render an authored open memory heart instead of a generic solid primitive');
assert.ok(source.includes('function memoryFilamentGeometry('), 'Life Map must give each memory a branching spatial silhouette');
assert.ok(source.includes('life-map-v227-open-braided-arrival-chamber'), 'selected arrival must remain an open braided place instead of an oversized enclosing egg');
assert.ok(source.includes('name={`life-map-smooth-memory-star-${siteKey}`}'), 'memories must remain individually addressable in the spatial scene');
assert.ok(!source.includes('new THREE.SphereGeometry(1, 72, 54)'), 'the rejected smooth egg geometry must not return');
assert.ok(source.includes('// V226 literal-pixel authority: a suspended living memory galaxy with no heightfield, slabs, shards, or mineral presentation.'), 'The active Life Map source must declare the V226 presentation boundary');
assert.ok(!/function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/.test(source), 'Rejected grounded strata and shard-like memory presentations must not re-enter runtime');

console.log('Life Map memory-star presentation contract passed');
