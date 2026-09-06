import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url),
  'utf8',
);

assert.ok(
  source.includes('const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";'),
  'Life Map must keep the governed authored memory-star GLB as its runtime asset authority',
);
assert.ok(
  source.includes('name === "memory-star-heart"'),
  'Life Map must suppress the rejected authored memory-star heart presentation node',
);
assert.ok(
  source.includes('name.startsWith("memory-star-orbit-")'),
  'Life Map must suppress the rejected authored memory-star orbit presentation family',
);
assert.ok(
  source.includes('prepareAuthoredModel(scene, aura, hideRejectedMemoryStarPresentationNode)'),
  'AuthoredMemoryStar must apply the rejected-presentation filter to its cloned governed asset',
);
assert.ok(
  source.includes('name.startsWith("memory-star-shard-")'),
  'Life Map must suppress the rejected repeated shard-star presentation family',
);
assert.ok(
  source.includes('name === "memory-star-core"'),
  'Life Map must suppress the rejected generic energy-core presentation node',
);
assert.ok(
  source.includes('function MemorySeed(') && source.includes('name="life-map-sculpted-memory-seed"'),
  'Life Map must replace rejected starburst geometry with the restrained sculpted memory seed',
);

console.log('Life Map memory-star presentation contract passed');
