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
  const count = 620
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#bfe9ff')
  const warm = new THREE.Color('#ffe2b6')
  const violet = new THREE.Color('#cfc5ff')
  for (let index = 0; index < count; index += 1) {
    const radius = 6 + Math.pow(seeded(index + 41, 2), .58) * 30
    const angle = seeded(index + 41, 3) * Math.PI * 2
    const depth = 6 - seeded(index + 41, 4) * 76
    positions.set([Math.cos(angle) * radius, (seeded(index + 41, 5) - .5) * 30, depth], index * 3)
    const base = index % 7 === 0 ? warm : index % 5 === 0 ? violet : cool
    const color = base.clone().multiplyScalar(.44 + seeded(index + 41, 6) * .56)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryMotes(node: LifeMapNode, index: number, active: boolean) {
  const seed = nodeSeed(node, index)
  const count = active ? 30 : 14
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const aura = new THREE.Color(node.aura)
  const white = new THREE.Color('#fff8e8')
  for (let mote = 0; mote < count; mote += 1) {
    const angle = mote * 2.39996323 + seeded(seed, mote) * .9
    const radius = .14 + Math.sqrt((mote + .5) / count) * (active ? .95 : .58)
    positions.set([Math.cos(angle) * radius, (seeded(seed + mote, 11) - .5) * (active ? 1.25 : .72), Math.sin(angle) * radius], mote * 3)
    const color = aura.clone().lerp(white, .25 + seeded(seed + mote, 12) * .45)
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
    const pulse = 1 + Math.sin(clock.elapsedTime * .62 + index * .83) * (active ? .035 : .018)
    root.current.scale.setScalar(pulse)
  })
  const core = active ? .15 : .09
  return <group ref={root} position={point} name={`life-map-v258-stellar-memory-${node.id}`} userData={{ visualOnly: true, interactionOwner: false, presentation: 'stellar-memory-not-node-graph' }} raycast={() => null}>
    <mesh raycast={() => null}><sphereGeometry args={[core, 20, 16]} /><meshBasicMaterial color="#fffdf4" toneMapped={false} /></mesh>
    <mesh scale={active ? 3.5 : 2.8} raycast={() => null}><sphereGeometry args={[core, 16, 12]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? .20 : .12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    <mesh scale={active ? 6.8 : 5.4} raycast={() => null}><sphereGeometry args={[core, 14, 10]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? .06 : .034} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    <points geometry={motes} raycast={() => null}><pointsMaterial vertexColors size={active ? .036 : .023} transparent opacity={active ? .72 : .40} depthWrite={false} sizeAttenuation /></points>
    <pointLight color={node.aura} intensity={active ? 3.2 : .72} distance={active ? 8.8 : 4.4} decay={2} />
  </group>
}

export function LifeMapStellarField({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(depthGeometry, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (root.current && !reducedMotion) root.current.rotation.z = Math.sin(clock.elapsedTime * .012) * .006
  })
  return <group name="life-map-v258-stellar-visual-authority" userData={{ visualOnly: true, interactionOwner: false, visualRepair: 'deep-layered-personal-galaxy' }} raycast={() => null}>
    <points ref={root} geometry={geometry} name="life-map-v258-deep-personal-galaxy" raycast={() => null}>
      <pointsMaterial vertexColors size={.058} transparent opacity={.78} depthWrite={false} sizeAttenuation />
    </points>
    {nodes.map((node, index) => <StellarMemory key={node.id} node={node} index={index} active={selected?.id === node.id} reducedMotion={reducedMotion} />)}
  </group>
}
