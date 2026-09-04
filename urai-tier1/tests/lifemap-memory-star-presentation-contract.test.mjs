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
assert.equal(
  source.includes('name.startsWith("memory-star-shard-")'),
  false,
  'governed memory-star shards must not be suppressed by the presentation filter',
);
assert.equal(
  source.includes('name === "memory-star-core"'),
  false,
  'governed memory-star core must not be suppressed by the presentation filter',
);

console.log('Life Map memory-star presentation contract passed');
