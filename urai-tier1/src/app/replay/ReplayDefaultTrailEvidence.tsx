'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Non-release evidence of the ACTUAL default Replay mesh, never the alternate GLB.
 * Only numbers about the disclosed demo world are exposed; no user memory content.
 */
export default function ReplayDefaultTrailEvidence() {
  const measured = useRef(false)
  const owner = useRef<HTMLElement | null>(null)
  const frameTimes = useRef<number[]>([])
  const frameCount = useRef(0)

  useFrame(({ camera, gl, scene }, delta) => {
    const root = owner.current ?? gl.domElement.closest<HTMLElement>('main.replayWorld[data-memory-status="demo"]')
    if (!root) return
    owner.current = root

    if (!measured.current) {
      const trail = scene.getObjectByName('replay-memory-worn-trail')
      const ground = scene.getObjectByName('replay-memory-terrain')
      if (!(trail instanceof THREE.Mesh) || !(ground instanceof THREE.Mesh)) return
      trail.updateWorldMatrix(true, false)
      ground.updateWorldMatrix(true, false)

      const vertices = trail.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
      const triangles = (trail.geometry.getIndex()?.count ?? 0) / 3
      if (!vertices || !Number.isInteger(triangles)) return

      const sampleCount = 0
      let sampled = sampleCount
      let misses = 0
      let minContact = Infinity
      let maxContact = -Infinity
      const down = new THREE.Vector3(0, -1, 0)
      const world = new THREE.Vector3()
      const raycaster = new THREE.Raycaster()
      const stride = Math.max(1, Math.floor((vertices.count - 1) / 48))
      for (let i = 0; i < vertices.count; i += stride) {
        world.set(vertices.getX(i), vertices.getY(i), vertices.getZ(i)).applyMatrix4(trail.matrixWorld)
        raycaster.set(new THREE.Vector3(world.x, world.y + 5, world.z), down)
        raycaster.far = 9
        const hit = raycaster.intersectObject(ground, false)[0]
        sampled += 1
        if (!hit) { misses += 1; continue }
        const contact = world.y - hit.point.y
        minContact = Math.min(minContact, contact)
        maxContact = Math.max(maxContact, contact)
      }
      // Always test the final row, including the terrain boundary.
      const last = vertices.count - 1
      world.set(vertices.getX(last), vertices.getY(last), vertices.getZ(last)).applyMatrix4(trail.matrixWorld)
      raycaster.set(new THREE.Vector3(world.x, world.y + 5, world.z), down)
      const lastHit = raycaster.intersectObject(ground, false)[0]
      sampled += 1
      if (!lastHit) misses += 1
      else {
        const contact = world.y - lastHit.point.y
        minContact = Math.min(minContact, contact)
        maxContact = Math.max(maxContact, contact)
      }

      let stones = 0
      scene.traverse(object => { if (object.name.startsWith('replay-memory-trail-stone-')) stones++ })
      const material = trail.material
      const pbr = material instanceof THREE.MeshStandardMaterial &&
        Boolean(material.map && material.normalMap && material.vertexColors)
      camera.updateMatrixWorld()
      const clip = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      const visible = new THREE.Frustum().setFromProjectionMatrix(clip).intersectsBox(new THREE.Box3().setFromObject(trail))
      const actualWebgl = Boolean(gl.getContext())
      const passed = sampled >= 45 && misses === 0 && minContact > .005 && maxContact < .09 &&
        vertices.count === 873 && triangles === 1536 && stones === 11 && pbr && visible && actualWebgl
      root.dataset.replayDefaultTrailEvidence = JSON.stringify({
        kind: 'real-default-replay-trail',
        sourceClass: 'disclosed-demonstration',
        admitted: false,
        mesh: trail.name,
        groundMesh: ground.name,
        vertices: vertices.count,
        triangles,
        sampled,
        rayMisses: misses,
        minTerrainContact: Number.isFinite(minContact) ? Number(minContact.toFixed(5)) : null,
        maxTerrainContact: Number.isFinite(maxContact) ? Number(maxContact.toFixed(5)) : null,
        edgeStones: stones,
        pbr,
        visible,
        webgl: actualWebgl,
        passed,
      })
      measured.current = true
    }

    if (Number.isFinite(delta) && delta > 0 && delta < 3) {
      frameTimes.current.push(delta * 1000)
      if (frameTimes.current.length > 120) frameTimes.current.shift()
    }
    frameCount.current += 1
    if (frameCount.current % 10 === 0 || frameCount.current === 1) {
      const values = [...frameTimes.current].sort((a, b) => a - b)
      const p95 = values.length ? values[Math.ceil(values.length * .95) - 1] : null
      root.dataset.replayDefaultTrailPacing = JSON.stringify({
        samples: values.length,
        frameP95Ms: p95 == null ? null : Number(p95.toFixed(2)),
        cameraPosition: camera.position.toArray().map(x => Number(x.toFixed(5))),
        cameraQuaternion: camera.quaternion.toArray().map(x => Number(x.toFixed(5))),
        capturedAs: 'WebGL-runtime-samples-not-hardware-benchmark',
      })
    }
  })

  useEffect(() => () => {
    if (!owner.current) return
    delete owner.current.dataset.replayDefaultTrailEvidence
    delete owner.current.dataset.replayDefaultTrailPacing
  }, [])

  return null
}
