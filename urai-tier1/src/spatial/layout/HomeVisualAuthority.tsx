'use client'

import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { height } from './HomeWorldProductionV223Geometry'
import { HomeOrbGroundedV288 } from '../assets/HomeOrbGroundedV288'

function hasAncestor(object: THREE.Object3D, name: string) {
  for (let current = object.parent; current; current = current.parent) {
    if (current.name === name) return true
  }
  return false
}

function isTransparentInteractionSurface(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return false
  const materials = Array.isArray(object.material) ? object.material : [object.material]
  return materials.some((material) => material instanceof THREE.MeshBasicMaterial && material.transparent && material.opacity === 0)
}

function hasColorTexture(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return false
  const materials = Array.isArray(object.material) ? object.material : [object.material]
  return materials.some((material) => material instanceof THREE.MeshStandardMaterial && Boolean(material.map))
}

function SanctuaryDressingV253() {
  const lanternStem = useMemo(() => new THREE.CylinderGeometry(.055, .09, .44, 7), [])
  const lanternCore = useMemo(() => new THREE.IcosahedronGeometry(.075, 1), [])
  const trunk = useMemo(() => new THREE.CylinderGeometry(.12, .23, 1.65, 7), [])
  const crown = useMemo(() => new THREE.IcosahedronGeometry(.62, 2), [])
  const cairn = useMemo(() => new THREE.IcosahedronGeometry(.34, 1), [])
  const steppingStone = useMemo(() => new THREE.IcosahedronGeometry(.42, 1), [])
  const fireflies = useMemo(() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1
      const lane = 2.8 + ((i * 37) % 70) / 10
      const z = 2.8 - ((i * 53) % 170) / 10
      const x = side * lane + Math.sin(i * 2.17) * 1.1
      const y = height(x, z) + .28 + ((i * 29) % 33) / 16
      positions.set([x, y, z], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  const lanterns = useMemo(() => [
    [-1.82, 2.05, .92], [1.86, 1.42, .90], [-2.12, -.70, .92], [2.10, -1.46, .96],
    [-2.28, -3.56, .94], [2.30, -4.20, .96], [-2.40, -6.42, .91], [2.44, -7.10, .94],
    [-2.58, -9.18, .88], [2.60, -9.72, .90],
  ] as const, [])

  const trees = useMemo(() => [
    [-6.7,2.7,.92,-.18],[-7.5,-.3,1.08,.14],[-6.6,-3.4,.82,-.24],[-7.2,-6.5,1.02,.20],[-6.4,-9.8,.88,-.10],[-5.7,-12.7,.96,.16],
    [6.8,2.2,.98,.16],[7.6,-.8,.88,-.18],[6.9,-3.9,1.06,.22],[7.4,-6.9,.90,-.15],[6.5,-10.2,1.0,.12],[5.8,-13.1,.92,-.16],
    [-9.2,-2.2,.72,.25],[9.0,-2.8,.76,-.22],[-8.5,-8.6,.80,-.14],[8.6,-9.1,.78,.18],
  ] as const, [])

  const cairns = useMemo(() => [
    [-4.8,1.2,.54],[-5.3,-1.9,.48],[-4.9,-5.0,.56],[-5.1,-8.2,.50],[-4.6,-11.1,.52],
    [4.9,.5,.50],[5.4,-2.5,.56],[5.0,-5.7,.48],[5.2,-8.7,.54],[4.7,-11.5,.50],
  ] as const, [])

  const pathStones = useMemo(() => Array.from({length: 15}, (_, i) => {
    const z = 4.0 - i * 1.25
    const x = Math.sin(i * 1.17) * .42
    const scale = .62 + (i % 3) * .06
    return [x, z, scale, (i % 2 ? .09 : -.08)] as const
  }), [])

  useEffect(() => () => {
    lanternStem.dispose(); lanternCore.dispose(); trunk.dispose(); crown.dispose(); cairn.dispose(); steppingStone.dispose(); fireflies.dispose()
  }, [cairn, crown, fireflies, lanternCore, lanternStem, steppingStone, trunk])

  return <group name="home-v253-authored-sanctuary-dressing" userData={{ visualOnly: true, interactionOwner: false, composition: 'layered-lantern-grove-cairn-path', orbVisualAuthority: 'retired-v253-orb-removed-v286' }}>
    <hemisphereLight args={['#718889','#1a1714',.36]} />

    {pathStones.map(([x,z,scale,rz], index) => {
      const y = height(x,z)
      return <mesh key={`path-${index}`} geometry={steppingStone} position={[x,y+.025,z]} scale={[scale,.08,scale*.82]} rotation={[0,index*.38,rz]} raycast={() => null} receiveShadow>
        <meshStandardMaterial color={index%2 ? '#514b40' : '#48463f'} roughness={.97} metalness={0} />
      </mesh>
    })}

    {lanterns.map(([x,z,scale], index) => {
      const y = height(x,z)
      const warm = index % 3 !== 0
      return <group key={`lantern-${index}`} position={[x,y,z]} scale={scale}>
        <mesh geometry={lanternStem} position={[0,.22,0]} raycast={() => null} castShadow><meshStandardMaterial color="#35312b" roughness={.92} /></mesh>
        <mesh geometry={lanternCore} position={[0,.52,0]} raycast={() => null}>
          <meshStandardMaterial color={warm?'#e4a276':'#b78d77'} emissive={warm?'#c06948':'#82554b'} emissiveIntensity={.66} roughness={.38} />
        </mesh>
        <pointLight position={[0,.54,0]} color={warm?'#e4a276':'#c48675'} intensity={.28} distance={2.25} decay={2} />
      </group>
    })}

    {trees.map(([x,z,scale,yaw], index) => {
      const y=height(x,z)
      const crownTint = index%3===0 ? '#2f4337' : index%3===1 ? '#344b3e' : '#3f4937'
      return <group key={`tree-${index}`} position={[x,y,z]} scale={scale} rotation={[0,yaw,0]}>
        <mesh geometry={trunk} position={[0,.78,0]} rotation={[0,0,index%2?.055:-.045]} raycast={() => null} castShadow>
          <meshStandardMaterial color="#3d3129" roughness={1} />
        </mesh>
        <mesh geometry={crown} position={[index%2?.16:-.13,1.95,0]} scale={[.86,1.16,.82]} raycast={() => null} castShadow receiveShadow>
          <meshStandardMaterial color={crownTint} roughness={.96} emissive="#0c1711" emissiveIntensity={.05} />
        </mesh>
        <mesh geometry={crown} position={[index%2?-.26:.28,2.35,.05]} scale={[.62,.82,.58]} raycast={() => null} castShadow receiveShadow>
          <meshStandardMaterial color={index%2?'#3c523f':'#40523e'} roughness={.97} />
        </mesh>
      </group>
    })}

    {cairns.map(([x,z,scale], index) => {
      const y=height(x,z)
      return <group key={`cairn-${index}`} position={[x,y,z]} rotation={[0,index*.71,0]}>
        {[0,1,2].map(level => <mesh key={level} geometry={cairn} position={[level*.035-.03,.13+level*.20,0]} scale={[scale*(1-level*.16),.42-level*.07,scale*(.92-level*.14)]} raycast={() => null} castShadow receiveShadow>
          <meshStandardMaterial color={level===2?'#66584b':index%2?'#4c5047':'#514a42'} roughness={.98} />
        </mesh>)}
      </group>
    })}

    <points geometry={fireflies} raycast={() => null}>
      <pointsMaterial color="#d9b982" size={.024} sizeAttenuation transparent opacity={.34} depthWrite={false} />
    </points>

    <pointLight position={[0,1.25,-4.4]} color="#d58f69" intensity={.62} distance={11.5} decay={2} />
    <pointLight position={[-4.8,2.1,-7.8]} color="#9a765e" intensity={.25} distance={8.5} decay={2} />
    <pointLight position={[4.7,2.0,-8.4]} color="#bd8063" intensity={.24} distance={8.5} decay={2} />
  </group>
}

/**
 * Current Home ownership guard.
 *
 * V288 preserves V287 cinematic Home/Ground/sky-threshold ownership and mounts
 * the V286 biomorphic reliquary through a grounded integration adapter. The
 * V287 fallback companion remains the pointer/touch owner but cannot paint
 * pixels; the reliquary remains visual-only and cannot steal interaction.
 */
export function HomeVisualAuthority() {
  const { scene } = useThree()

  useEffect(() => {
    const changed = new Set<THREE.Object3D>()
    const previousRaycast = new Map<THREE.Object3D, THREE.Object3D['raycast']>()

    const disableRaycast = (object: THREE.Object3D) => {
      if (!(object instanceof THREE.Mesh) || isTransparentInteractionSurface(object) || previousRaycast.has(object)) return
      previousRaycast.set(object, object.raycast)
      object.raycast = () => {}
    }

    const setOff = (object: THREE.Object3D) => {
      if (!object.visible) return
      object.visible = false
      disableRaycast(object)
      changed.add(object)
    }

    const setSubtreeOff = (object: THREE.Object3D) => {
      setOff(object)
      object.traverse((child) => disableRaycast(child))
    }

    const apply = () => scene.traverse((object) => {
      if (object.name === 'home-v226-root-cradle') {
        setSubtreeOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-ground-inhabited-hearth')) {
        if (object.type !== 'Group' && object.name !== 'home-ground-deep-traversable-entrance') setOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-life-map-lineage-observatory')) {
        if (object.type !== 'Group' && object.name !== 'home-life-map-deep-celestial-aperture') setOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-rooted-single-living-memory-presence')) {
        if (object.type !== 'Group' && !isTransparentInteractionSurface(object)) setOff(object)
        return
      }

      if ((hasAncestor(object, 'home-v234-ground-scanned-stone-threshold') || hasAncestor(object, 'home-v234-life-map-rooted-observatory')) && hasColorTexture(object)) {
        setOff(object)
      }
    })

    apply()
    const timer = window.setInterval(apply, 120)
    const settle = window.setTimeout(() => window.clearInterval(timer), 3200)

    return () => {
      window.clearInterval(timer)
      window.clearTimeout(settle)
      previousRaycast.forEach((raycast, object) => { object.raycast = raycast })
      changed.forEach((object) => { object.visible = true })
    }
  }, [scene])

  return <>
    <SanctuaryDressingV253 />
    <HomeOrbGroundedV288 />
  </>
}
