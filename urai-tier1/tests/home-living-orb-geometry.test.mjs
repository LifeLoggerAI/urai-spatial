import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  createLivingMemoryGeometry, createMemoryFieldGeometry, createMemoryFilamentGeometry,
} from '../src/spatial/layout/HomeLivingOrbGeometry.ts'
import {
  createAuthoredOrbLightPresentation, disposeAuthoredOrbLightPresentation,
} from '../src/spatial/layout/HomeAuthoredOrbLight.ts'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')

test('the living mantle is a finite smooth closed connected surface within the companion footprint', (context) => {
  const geometry = createLivingMemoryGeometry()
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
  const indices = geometry.getIndex()
  assert.ok(positions.count <= 65 * 49, 'preserve the bounded 64 by 48 surface budget')
  assert.ok(indices.count <= 64 * 47 * 6)
  const points = Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index))
  for (let index = 0; index < positions.count; index++) {
    assert.ok(points[index].toArray().every(Number.isFinite))
    const normal = new THREE.Vector3().fromBufferAttribute(normals, index)
    assert.ok(normal.toArray().every(Number.isFinite))
    assert.ok(Math.abs(normal.length() - 1) < 1e-5, 'seam and pole normals must remain unit length')
  }
  const edges = new Map(), neighbors = Array.from({ length: points.length }, () => new Set())
  let smallestFace = Infinity
  for (let offset = 0; offset < indices.count; offset += 3) {
    const vertices = [0, 1, 2].map(step => indices.getX(offset + step))
    const [a, b, c] = vertices.map(index => points[index])
    const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length()
    assert.ok(area > 1e-10, 'welded surface must not retain degenerate triangles')
    smallestFace = Math.min(smallestFace, area)
    for (let step = 0; step < 3; step++) {
      const a = vertices[step], b = vertices[(step + 1) % 3]
      const key = a < b ? a + ':' + b : b + ':' + a
      edges.set(key, (edges.get(key) ?? 0) + 1)
      neighbors[a].add(b); neighbors[b].add(a)
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'no seam, pole hole or disconnected overlapping mantle')
  const seen = new Set([0]), queue = [0]
  for (let at = 0; at < queue.length; at++) for (const neighbor of neighbors[queue[at]]) {
    if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor) }
  }
  assert.equal(seen.size, points.length, 'all surface vertices must belong to one connected body')
  assert.equal(points.length - edges.size + indices.count / 3, 2, 'the mantle is one closed genus-zero surface')
  assert.ok(geometry.boundingSphere.center.length() + geometry.boundingSphere.radius <= .72, 'bound the full three-dimensional framing envelope')
  assert.ok(Math.max(...points.map(point => Math.hypot(point.x, point.z))) <= .54, 'fit the current unchanged horizontal physical footprint')
  assert.ok(geometry.boundingBox.min.y >= -.64, 'keep the tapered root above the current ground clearance')
  context.diagnostic(JSON.stringify({ vertices: positions.count, triangles: indices.count / 3, originEnvelope: geometry.boundingSphere.center.length() + geometry.boundingSphere.radius, minimumY: geometry.boundingBox.min.y, smallestFace }))
  geometry.dispose()
})

test('the actual mantle has unequal folds rather than a translated or rescaled sphere', (context) => {
  const geometry = createLivingMemoryGeometry()
  const positions = geometry.getAttribute('position')
  const center = geometry.boundingBox.getCenter(new THREE.Vector3())
  const points = Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index))
  const radii = points.map(point => point.distanceTo(center))
  assert.ok(Math.max(...radii) / Math.min(...radii) > 1.4, 'a sphere must not replace the tapered folded silhouette')
  let mirrorError = 0
  for (let index = 0; index < points.length; index += 23) {
    const mirrored = points[index].clone()
    mirrored.x = 2 * center.x - mirrored.x
    const nearest = Math.min(...points.map(point => point.distanceTo(mirrored)))
    mirrorError = Math.max(mirrorError, nearest)
  }
  assert.ok(mirrorError > .025, 'left and right folds must not collapse into a symmetric shell')
  const colors = geometry.getAttribute('color')
  for (let index = 0; index < colors.count; index++) {
    assert.ok([colors.getX(index), colors.getY(index), colors.getZ(index)].every(value => Number.isFinite(value) && value >= 0 && value <= 1))
    assert.ok(colors.getY(index) > .35, 'retain luminous pearl and teal vertex color rather than opaque dark stone')
  }
  context.diagnostic(JSON.stringify({ minimumRadius: Math.min(...radii), maximumRadius: Math.max(...radii), mirrorErrorMeters: mirrorError }))
  geometry.dispose()
})

function assertInterior(geometry, mantle) {
  const mesh = new THREE.Mesh(mantle, new THREE.MeshBasicMaterial({ side: THREE.BackSide }))
  mesh.updateMatrixWorld()
  const raycaster = new THREE.Raycaster()
  const origin = mantle.boundingBox.getCenter(new THREE.Vector3())
  const positions = geometry.getAttribute('position')
  for (let index = 0; index < positions.count; index++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index)
    assert.ok(point.toArray().every(Number.isFinite))
    const delta = point.clone().sub(origin)
    assert.ok(delta.length() > .001, 'interior detail must not collapse to the origin')
    raycaster.set(origin, delta.clone().normalize())
    const hit = raycaster.intersectObject(mesh, false)[0]
    assert.ok(hit, 'the actual mantle must enclose each interior sample')
    assert.ok(delta.length() < hit.distance - .01, 'motes and filaments must remain recessed inside the actual mantle')
  }
  mesh.material.dispose()
}

test('memory motes and curved filaments are deterministic bounded interior detail', () => {
  const mantle = createLivingMemoryGeometry()
  const field = createMemoryFieldGeometry(mantle), filaments = createMemoryFilamentGeometry(mantle)
  const repeatedField = createMemoryFieldGeometry(mantle), repeatedFilaments = createMemoryFilamentGeometry(mantle)
  assert.equal(field.getAttribute('position').count, 180)
  assert.equal(filaments.getAttribute('position').count, 7 * 24 * 2)
  assert.deepEqual(field.getAttribute('position').array, repeatedField.getAttribute('position').array)
  assert.deepEqual(field.getAttribute('color').array, repeatedField.getAttribute('color').array)
  assert.deepEqual(filaments.getAttribute('position').array, repeatedFilaments.getAttribute('position').array)
  assertInterior(field, mantle)
  assertInterior(filaments, mantle)
  for (const geometry of [mantle, field, filaments, repeatedField, repeatedFilaments]) geometry.dispose()
})

test('the active Home owner mounts the organic helpers without wireframe or flat shading', () => {
  const orb = owner.slice(owner.indexOf('function SacredOrb('), owner.indexOf('function OrbPlatform('))
  assert.ok(orb.length > 0)
  for (const name of ['createLivingMemoryGeometry', 'createMemoryFieldGeometry', 'createMemoryFilamentGeometry']) {
    assert.ok(owner.includes('HomeLivingOrbGeometry'), 'the active owner must import the geometry module')
    assert.ok(orb.includes(name), 'active Orb must use ' + name)
  }
  assert.doesNotMatch(orb, /wireframe|flatShading|<sphereGeometry args=\{\[\.43,/)
  assert.match(orb, /useAnimations\(orb\.animations, authoredOrb\)/, 'preserve governed authored clip ownership')
  assert.match(orb, /staticPresentation/, 'preserve sensory reduced-motion and privacy presentation')
  assert.match(orb, /allActions\.forEach\(\(action\) => action\.stop\(\)\)/)
})

test('every governed Orb clip visibly drives bounded light descendants and stops without changing the cached asset', async (context) => {
  const bytes = fs.readFileSync(new URL('../public/assets/urai/generated/models/urai-orb-avatar-v1.glb', import.meta.url))
  const loader = new GLTFLoader()
  // Load the actual hierarchy, geometry and clips. Texture decoding is unrelated
  // to transform verification and would require a browser image implementation.
  loader.register(() => ({ name: 'TEST_TRANSFORMS_WITHOUT_IMAGE_DECODE', loadTexture: () => Promise.resolve(null) }))
  const asset = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  assert.equal(asset.animations.length, 12, 'retain every governed clip')
  const sourceBefore = JSON.stringify(asset.scene.toJSON())
  const sourceResources = new Set()
  asset.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    sourceResources.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) sourceResources.add(material)
  })
  let disposedSourceResources = 0
  sourceResources.forEach(resource => resource.addEventListener('dispose', () => { disposedSourceResources++ }))
  const texture = new THREE.Texture()
  let disposedSharedTexture = 0
  texture.addEventListener('dispose', () => { disposedSharedTexture++ })
  const presentation = createAuthoredOrbLightPresentation(asset.scene, texture)
  const scale = Number(owner.match(/state === 'speaking' \? ([\d.]+) : state === 'listening'/)?.[1])
  assert.equal(scale, .37, 'measure the unchanged maximum governed runtime scale')
  const group = new THREE.Group()
  group.scale.setScalar(scale)
  group.add(presentation)
  const sprites = []
  presentation.traverse(object => {
    if (object instanceof THREE.Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      assert.ok(materials.every(material => !material.colorWrite && !material.depthWrite), 'authored solids must not draw stone, facets or depth masks')
    }
    if (!(object instanceof THREE.Sprite)) return
    assert.ok(object.visible && object.material.visible && object.material.opacity > 0, 'each light must actually be visible')
    assert.equal(object.material.depthWrite, false)
    assert.equal(object.material.blending, THREE.AdditiveBlending)
    assert.equal(object.material.map, texture)
    const intersections = []
    object.raycast(new THREE.Raycaster(), intersections)
    assert.equal(intersections.length, 0, 'presentation lights must not intercept Orb input')
    sprites.push(object)
  })
  assert.ok(sprites.length > 0 && sprites.length <= 24, 'bound authored light draw calls')
  const signature = sprite => {
    const position = sprite.getWorldPosition(new THREE.Vector3())
    const size = sprite.getWorldScale(new THREE.Vector3())
    // A billboard ignores object rotation. Only its center or drawn size counts
    // as visible motion; retaining an inert animated matrix is insufficient.
    return [position.x, position.y, position.z, size.x, size.y]
  }
  const sameSignature = (a, b) => a.every((value, index) => Math.abs(value - b[index]) < 1e-8)
  group.updateWorldMatrix(true, true)
  const resting = sprites.map(signature)
  const mixer = new THREE.AnimationMixer(presentation)
  const clipTargets = new Set()
  let maximumHorizontalEnvelope = 0
  for (const clip of asset.animations) {
    const targets = [...new Set(clip.tracks.map(track => THREE.PropertyBinding.parseTrackName(track.name).nodeName))]
    const visibleTargets = targets.map(name => {
      clipTargets.add(name)
      const target = presentation.getObjectByName(name)
      assert.ok(target, `${clip.name} retains target ${name}`)
      for (let node = target; node; node = node.parent) assert.ok(node.visible, `${name} must not hide its light descendants`)
      const descendants = []
      target.traverse(object => { if (object instanceof THREE.Sprite) descendants.push(object) })
      assert.ok(descendants.length > 0, `${clip.name} must affect a visible light`)
      return { name, descendants, changed: false, initial: descendants.map(signature) }
    })
    mixer.clipAction(clip).reset().play()
    for (let step = 0; step <= 32; step++) {
      mixer.setTime(clip.duration * step / 32)
      group.updateWorldMatrix(true, true)
      for (const target of visibleTargets) {
        target.changed ||= target.descendants.some((sprite, index) => !sameSignature(signature(sprite), target.initial[index]))
      }
      for (const sprite of sprites) {
        const [x, , z, width, height] = signature(sprite)
        const envelope = Math.hypot(x, z) + .5 * Math.hypot(width, height)
        assert.ok(Number.isFinite(envelope) && envelope <= .54, `${clip.name} lights must fit the unchanged horizontal footprint`)
        maximumHorizontalEnvelope = Math.max(maximumHorizontalEnvelope, envelope)
      }
    }
    for (const target of visibleTargets) assert.ok(target.changed, `${clip.name} must visibly move or resize ${target.name} lights`)
    mixer.stopAllAction()
    group.updateWorldMatrix(true, true)
    assert.ok(sprites.every((sprite, index) => sameSignature(signature(sprite), resting[index])), `${clip.name} must restore the static composition when stopped`)
    mixer.update(1)
    group.updateWorldMatrix(true, true)
    assert.ok(sprites.every((sprite, index) => sameSignature(signature(sprite), resting[index])), 'a stopped presentation must remain still')
  }
  assert.equal(clipTargets.size, 6)
  assert.equal(JSON.stringify(asset.scene.toJSON()), sourceBefore, 'presentation and clip playback must not mutate the cached governed source')
  disposeAuthoredOrbLightPresentation(presentation)
  assert.equal(disposedSourceResources, 0, 'cleanup must not dispose shared asset resources')
  assert.equal(disposedSharedTexture, 0, 'the caller retains shared texture ownership')
  context.diagnostic(JSON.stringify({ governedClips: asset.animations.length, animatedOwners: clipTargets.size, visibleLights: sprites.length, maximumHorizontalEnvelope }))
  sourceResources.forEach(resource => resource.dispose())
  texture.dispose()
})
