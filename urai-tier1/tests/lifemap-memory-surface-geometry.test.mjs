import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('function seeded('), source.indexOf('function Current('));
const compiled = ts.transpile(section, { target: ts.ScriptTarget.ES2022 });
const build = new Function('THREE', `${compiled}; return memoryMembrane;`)(THREE);

test('memory surfaces retain finite normals, real depth, open boundaries, and a bounded triangle budget', () => {
  for (const seed of [0, 17, 911]) for (let layer = 0; layer < 6; layer++) {
    const geometry = build(seed, layer, layer === 0);
    for (const attribute of ['position', 'normal', 'color']) {
      assert.ok([...geometry.getAttribute(attribute).array].every(Number.isFinite), `${attribute} must be finite`);
    }
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.x > .75 && size.y > .22 && size.z > .25, 'grounded surface must retain horizontal extent, relief, and spatial depth');
    assert.ok(Math.max(size.x, size.y, size.z) < 3, 'surface must remain within the memory interaction envelope');
    assert.ok(geometry.index.count / 3 <= 2200, 'per-layer triangle budget must remain bounded');
    const edges = new Map();
    const indices = geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      for (const [a, b] of [[indices[i], indices[i+1]], [indices[i+1], indices[i+2]], [indices[i+2], indices[i]]]) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.ok([...edges.values()].some(count => count === 1), 'surface must remain open, not an enclosing shell');
    assert.ok([...edges.values()].every(count => count <= 2), 'surface must not contain nonmanifold edges');
    geometry.dispose();
  }
});
