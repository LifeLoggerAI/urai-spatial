import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');

assert.ok(source.includes('const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";'), 'Life Map must retain the governed memory-star GLB as hidden source and animation authority');
assert.ok(source.includes('<primitive object={hiddenAsset} visible={false} />'), 'The rejected authored memory-star presentation must remain wholly hidden');
assert.ok(source.includes('function memoryHeartGeometry('), 'Life Map must render an authored open memory heart instead of a generic solid primitive');
assert.ok(source.includes('function memoryFilamentGeometry('), 'Life Map must give each memory a branching spatial silhouette');
assert.ok(source.includes('new THREE.CatmullRomCurve3(points, false'), 'memory hearts, branches, and chambers must remain open rather than closing into orbital glyphs');
assert.ok(source.includes('function memoryMembrane('), 'memories must have authored open lamellar surfaces');
for (const form of ['petal', 'fan', 'wave', 'branch', 'shell']) {
  assert.ok(source.includes(`form=\"${form}\"`) || source.includes(`form === \"${form}\"`), `semantic memory form ${form} must remain authored`);
}
assert.ok(source.includes("v237-grounded-semantic-outcrops"), 'the literal-pixel repair must identify the grounded varied semantic form authority');
assert.ok(source.includes('Math.pow(Math.sin(Math.PI * t), .74)'), 'memory surfaces must taper at both ends');
assert.ok(source.includes('geometry.computeVertexNormals()'), 'memory surfaces must carry valid lighting normals');
assert.ok(!source.includes('const originT = (filament + 1) / 10'), 'rejected uniform bare branch presentation must not return');
assert.ok(source.includes('life-map-v229-open-branching-memory-grove'), 'selected arrival must remain an open branching place instead of an enclosing wire cage');
assert.ok(source.includes('Array.from({ length: 7 }'), 'the arrival place must preserve seven offset open currents');
assert.ok(!source.includes('radius * Math.sin(t * Math.PI)'), 'arrival threads must not converge into a wire-cage pole');
assert.ok(source.includes('name={`life-map-weathered-memory-outcrop-${siteKey}`}'), 'memories must remain individually addressable in the spatial scene');
assert.ok(!source.includes('new THREE.SphereGeometry(1, 72, 54)'), 'the rejected smooth egg geometry must not return');
assert.ok(source.includes('// V237 literal-pixel authority: a continuous illuminated memory valley whose'), 'The active Life Map source must declare the grounded V237 presentation boundary');
assert.ok(source.includes('function LivingMemoryGeography()'), 'Life Map must render a continuous authored geography beneath memory manifestations');
assert.ok(source.includes('function MemoryRoots('), 'memory manifestations must visibly grow from the environment');
assert.ok(source.includes('Array.from({ length: 2 }'), 'memory outcrops must use restrained material strata rather than cloned flower whorls');
assert.ok(source.includes('emissiveIntensity={.32}'), 'continuous terrain must remain materially readable instead of collapsing to black cut planes');
assert.ok(!/function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/.test(source), 'Rejected grounded strata and shard-like memory presentations must not re-enter runtime');

console.log('Life Map memory-star presentation contract passed');
