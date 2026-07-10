#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function patchFile(relativePath, replacements) {
  const file = join(root, relativePath)
  let source = readFileSync(file, 'utf8')

  for (const { label, before, after } of replacements) {
    const first = source.indexOf(before)
    if (first < 0) throw new Error(`${relativePath}: ${label}: expected source not found`)
    if (source.indexOf(before, first + before.length) >= 0) {
      throw new Error(`${relativePath}: ${label}: expected source is ambiguous`)
    }
    source = source.slice(0, first) + after + source.slice(first + before.length)
  }

  writeFileSync(file, source)
  return relativePath
}

const forgePath = 'scripts/forge-launch-critical-assets.mjs'
const auditPath = 'scripts/audit-launch-critical-artifact.mjs'

patchFile(forgePath, [
  {
    label: 'robust triangle measurement',
    before: `    const triangleCount = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((meshSum, primitive) => {
      const accessor = json.accessors[primitive.indices]
      return meshSum + Math.floor(accessor.count / 3)
    }, 0), 0)`,
    after: `    const triangleCount = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((meshSum, primitive) => {
      const positionAccessor = json.accessors?.[primitive.attributes?.POSITION]
      const indexAccessor = primitive.indices == null ? null : json.accessors?.[primitive.indices]
      const elementCount = indexAccessor?.count ?? positionAccessor?.count
      if (!Number.isFinite(elementCount)) throw new Error('GLB primitive is missing index and POSITION counts')
      return meshSum + Math.floor(elementCount / 3)
    }, 0), 0)`,
  },
  {
    label: 'Euler to quaternion helper',
    before: `function sphere(name, center, radius, material, widthSegments = 20, heightSegments = 14) { return { name, type: 'sphere', center, radius, material, widthSegments, heightSegments } }

function buildGlb(sceneName, specs) {`,
    after: `function sphere(name, center, radius, material, widthSegments = 20, heightSegments = 14) { return { name, type: 'sphere', center, radius, material, widthSegments, heightSegments } }

function eulerToQuaternion([x = 0, y = 0, z = 0]) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2)
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2)
  const cz = Math.cos(z / 2), sz = Math.sin(z / 2)
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ]
}

function buildGlb(sceneName, specs) {`,
  },
  {
    label: 'write quaternion node rotations',
    before: `    nodes.push({ name: spec.name, mesh: meshIndex, rotation: spec.rotation })`,
    after: `    const rotation = spec.rotation ? eulerToQuaternion(spec.rotation) : null
    nodes.push({ name: spec.name, mesh: meshIndex, ...(rotation ? { rotation } : {}) })`,
  },
])

patchFile(auditPath, [
  {
    label: 'audit indexed and non-indexed triangles',
    before: `      const indexAccessor = json.accessors?.[primitive.indices]
      if (!indexAccessor) throw new Error('GLB primitive is missing an index accessor')
      triangleCount += Math.floor(indexAccessor.count / 3)
      const positionAccessor = json.accessors?.[primitive.attributes?.POSITION]
      if (!positionAccessor?.min || !positionAccessor?.max) throw new Error('GLB POSITION accessor is missing min/max bounds')`,
    after: `      const positionAccessor = json.accessors?.[primitive.attributes?.POSITION]
      if (!positionAccessor?.min || !positionAccessor?.max) throw new Error('GLB POSITION accessor is missing min/max bounds')
      const indexAccessor = primitive.indices == null ? null : json.accessors?.[primitive.indices]
      const elementCount = indexAccessor?.count ?? positionAccessor.count
      if (!Number.isFinite(elementCount)) throw new Error('GLB primitive is missing index and POSITION counts')
      triangleCount += Math.floor(elementCount / 3)`,
  },
])

console.log(JSON.stringify({
  ok: true,
  patched: [forgePath, auditPath],
  guarantees: [
    'indexed and non-indexed triangle counting',
    'glTF quaternion node rotations',
  ],
}, null, 2))
