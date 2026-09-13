'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint } from './lifeMapSpatialLayout'

function seeded(seed: number, salt: number) {
  const value = Math.sin(seed * 91.317 + salt * 17.731) * 43758.5453123
  return value - Math.floor(value)
}

function nodeSeed(node: LifeMapNode, index: number) {
  return node.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37
}

function depthGeometry() {
  const count = 820
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#cceeff')
  const warm = new THREE.Color('#ffe6bd')
  const violet = new THREE.Color('#d7ceff')
  for (let index = 0; index < count; index += 1) {
    const radius = 4.5 + Math.pow(seeded(index + 41, 2), .58) * 32
    const angle = seeded(index + 41, 3) * Math.PI * 2
    const depth = 7 - seeded(index + 41, 4) * 82
    positions.set([Math.cos(angle) * radius, (seeded(index + 41, 5) - .5) * 34, depth], index * 3)
    const base = index % 9 === 0 ? warm : index % 6 === 0 ? violet : cool
    const color = base.clone().multiplyScalar(.40 + seeded(index + 41, 6) * .60)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryMotes(node: LifeMapNode, index: number, active: boolean) {
  const seed = nodeSeed(node, index)
  const count = active ? 48 : 20
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const aura = new THREE.Color(node.aura)
  const white = new THREE.Color('#fffaf0')
  for (let mote = 0; mote < count; mote += 1) {
    const angle = mote * 2.39996323 + seeded(seed, mote) * .9
    const radius = .13 + Math.sqrt((mote + .5) / count) * (active ? 1.28 : .72)
    positions.set([Math.cos(angle) * radius, (seeded(seed + mote, 11) - .5) * (active ? 1.55 : .88), Math.sin(angle) * radius], mote * 3)
    const color = aura.clone().lerp(white, .30 + seeded(seed + mote, 12) * .48)
    colors.set([color.r, color.g, color.b], mote * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function StellarMemory({ node, index, active, reducedMotion }: { node: LifeMapNode; index: number; active: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const point = useMemo(() => lifeMapLocalPoint(node, index), [node, index])
  const motes = useMemo(() => memoryMotes(node, index, active), [node, index, active])
  useEffect(() => () => motes.dispose(), [motes])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const pulse = 1 + Math.sin(clock.elapsedTime * .54 + index * .83) * (active ? .028 : .012)
    root.current.scale.setScalar(pulse)
  })
  const core = active ? .28 : .12
  return <group ref={root} position={point} renderOrder={120} name={`life-map-v259-stellar-memory-${node.id}`} userData={{ visualOnly: true, interactionOwner: false, presentation: 'white-hot-memory-star-over-semantic-hit-target' }} raycast={() => null}>
    <mesh renderOrder={123} raycast={() => null}>
      <sphereGeometry args={[core, 24, 18]} />
      <meshBasicMaterial color="#fffdf7" depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={122} scale={active ? 3.2 : 3.0} raycast={() => null}>
      <sphereGeometry args={[core, 20, 14]} />
      <meshBasicMaterial color={node.aura} transparent opacity={active ? .34 : .22} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={121} scale={active ? 6.3 : 5.8} raycast={() => null}>
      <sphereGeometry args={[core, 18, 12]} />
      <meshBasicMaterial color={node.aura} transparent opacity={active ? .10 : .055} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <points renderOrder={124} geometry={motes} raycast={() => null}>
      <pointsMaterial vertexColors size={active ? .052 : .030} transparent opacity={active ? .84 : .54} depthTest={false} depthWrite={false} sizeAttenuation />
    </points>
    <pointLight color={node.aura} intensity={active ? 4.1 : 1.0} distance={active ? 10.5 : 5.0} decay={2} />
  </group>
}

export function LifeMapStellarField({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(depthGeometry, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (root.current && !reducedMotion) root.current.rotation.z = Math.sin(clock.elapsedTime * .010) * .004
  })
  return <group name="life-map-v259-stellar-visual-authority" userData={{ visualOnly: true, interactionOwner: false, visualRepair: 'memory-stars-visually-authoritative-over-semantic-geology' }} raycast={() => null}>
    <points ref={root} geometry={geometry} name="life-map-v259-deep-personal-galaxy" raycast={() => null}>
      <pointsMaterial vertexColors size={.052} transparent opacity={.72} depthWrite={false} sizeAttenuation />
    </points>
    {nodes.map((node, index) => <StellarMemory key={node.id} node={node} index={index} active={selected?.id === node.id} reducedMotion={reducedMotion} />)}
  </group>
}
