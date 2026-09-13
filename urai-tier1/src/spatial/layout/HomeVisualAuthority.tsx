'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ORB, height } from './HomeWorldProductionV223Geometry'

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

function livingHeartGeometryV253() {
  const geometry = new THREE.SphereGeometry(1, 88, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deepTissue = new THREE.Color('#241317')
  const livingTissue = new THREE.Color('#6d3432')
  const liftedTissue = new THREE.Color('#a65e4c')
  const rememberedTissue = new THREE.Color('#d49570')
  const cooledMemory = new THREE.Color('#70433f')

  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index)
    const ny = position.getY(index)
    const nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, .10, .96)
    const lower = THREE.MathUtils.smoothstep(-ny, -.02, .98)
    const front = THREE.MathUtils.smoothstep(nz, -.18, .94)
    const taper = THREE.MathUtils.lerp(.08, 1, THREE.MathUtils.smoothstep(ny, -.98, .18))
    const lobeBand = Math.exp(-(((ny - .48) / .40) ** 2)) * upper
    const cleft = Math.exp(-((nx / .20) ** 2)) * THREE.MathUtils.smoothstep(ny, .28, .98)
    const leftLobe = Math.exp(-(((nx + .38) / .34) ** 2 + ((ny - .50) / .42) ** 2)) * upper
    const rightLobe = Math.exp(-(((nx - .30) / .40) ** 2 + ((ny - .45) / .44) ** 2)) * upper
    const anteriorFold = Math.exp(-(((nx + .09) / .34) ** 2 + ((nz - .48) / .26) ** 2)) * (.18 + .82 * front)
    const skin = .032 * Math.sin(angle * 3.1 + ny * 6.2) + .014 * Math.sin(angle * 7.4 - ny * 10.1)
    const radial = 1 + skin + .10 * leftLobe + .06 * rightLobe + .045 * anteriorFold

    let x = nx * radial * (.80 - .12 * upper) * taper
    x += Math.sign(nx || 1) * lobeBand * (.08 + .055 * Math.abs(nz))
    x += ny * .055 - lower * .025

    let z = nz * radial * (.62 + .04 * lobeBand) * taper
    z += .045 * anteriorFold

    let y = ny * 1.13
    y += .13 * leftLobe + .065 * rightLobe
    y -= .31 * cleft
    y -= lower * (.25 + .17 * lower)

    const twist = (ny + .10) * .10
    const cos = Math.cos(twist)
    const sin = Math.sin(twist)
    const tx = x * cos - z * sin
    const tz = x * sin + z * cos
    position.setXYZ(index, tx, y, tz)

    const altitude = THREE.MathUtils.clamp((y + 1.35) / 2.58, 0, 1)
    const tissueNoise = THREE.MathUtils.clamp(.5 + .5 * Math.sin(angle * 4.6 + ny * 8.4 + nz * 2.1), 0, 1)
    const memory = THREE.MathUtils.clamp(cleft * .28 + anteriorFold * .52 + front * .08, 0, 1)
    const cool = THREE.MathUtils.clamp((1 - front) * .18 + tissueNoise * .06, 0, .24)
    const color = deepTissue.clone()
      .lerp(livingTissue, .42 + altitude * .23)
      .lerp(liftedTissue, tissueNoise * .16 + leftLobe * .06)
      .lerp(rememberedTissue, memory * .32)
      .lerp(cooledMemory, cool)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function scarTubeV253() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.08, .70, .57),
    new THREE.Vector3(-.15, .52, .61),
    new THREE.Vector3(-.08, .31, .64),
    new THREE.Vector3(-.16, .08, .62),
    new THREE.Vector3(-.07, -.14, .57),
    new THREE.Vector3(-.12, -.36, .49),
    new THREE.Vector3(-.03, -.58, .36),
  ])
  return new THREE.TubeGeometry(curve, 60, .014, 8, false)
}

function filamentTubesV253() {
  return Array.from({ length: 12 }, (_, trace) => {
    const points: THREE.Vector3[] = []
    const side = trace < 6 ? -1 : 1
    const branch = trace % 6
    for (let step = 0; step <= 26; step++) {
      const t = step / 26
      const startY = -.48 + (branch % 3) * .08
      const endY = .54 - (branch % 2) * .11
      const y = THREE.MathUtils.lerp(startY, endY, t)
      const divergence = side * Math.pow(t, .82) * (.045 + branch * .026)
      const x = -.085 + divergence + Math.sin(t * 7.0 + trace * .63) * (.008 + t * .007)
      const z = .548 + Math.sin(t * Math.PI + trace * .31) * .028 + Math.sin(t * 5.2 + trace) * .007
      points.push(new THREE.Vector3(x, y, z))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 52, .0038 + (trace % 3) * .0007, 6, false)
  })
}

function rootTendrilsV253() {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = -.25 + index * (Math.PI * 2 / 8)
    const radius = 1.0 + (index % 3) * .22
    const points = [
      new THREE.Vector3(0, .07, 0),
      new THREE.Vector3(Math.cos(angle) * radius * .33, .045, Math.sin(angle) * radius * .33),
      new THREE.Vector3(Math.cos(angle + .13) * radius * .69, .025, Math.sin(angle + .13) * radius * .69),
      new THREE.Vector3(Math.cos(angle - .09) * radius, .018, Math.sin(angle - .09) * radius),
    ]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, .025 - (index % 2) * .004, 6, false)
  })
}

function memoryFieldV253() {
  const count = 280
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#a9685b')
  const warm = new THREE.Color('#d89a70')
  const ember = new THREE.Color('#efbf8f')

  for (let index = 0; index < count; index++) {
    const historyPoint = index < 154
    let x: number
    let y: number
    let z: number
    if (historyPoint) {
      const t = (index + .5) / 154
      y = -.58 + t * 1.37
      const side = index % 2 ? -1 : 1
      const branch = ((index * 17) % 29) / 29
      x = -.09 + side * (.025 + branch * .17) * Math.pow(t, .82) + Math.sin(index * 1.47) * .018
      z = .53 + Math.cos(index * 2.07) * .075 + Math.sin(t * 8.4) * .018
    } else {
      const t = (index - 154 + .5) / (count - 154)
      const orbit = index * 2.39996323
      const radius = .72 + Math.pow(t, .76) * .26
      y = -.72 + ((index * 23) % 126) / 125 * 1.50
      x = Math.cos(orbit) * radius * .67 - .03
      z = Math.sin(orbit) * radius * .30 + .02 * Math.sin(index * .37)
    }
    positions.set([x, y, z], index * 3)
    const color = historyPoint
      ? cool.clone().lerp(warm, .34 + .50 * ((index % 13) / 12)).lerp(ember, index % 11 === 0 ? .28 : 0)
      : cool.clone().lerp(warm, .12 + .22 * ((index % 17) / 16))
    colors.set([color.r, color.g, color.b], index * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function LiteralOrbAuthorityV253() {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const reducedMotion = useRef(false)
  const y = height(ORB.x, ORB.z)
  const heart = useMemo(livingHeartGeometryV253, [])
  const scar = useMemo(scarTubeV253, [])
  const filaments = useMemo(filamentTubesV253, [])
  const field = useMemo(memoryFieldV253, [])
  const filamentPalette = ['#c98268', '#d79a72', '#b9685c', '#e1ad80', '#c47c61', '#98605c']
  const memoryNodes = useMemo(() => [
    [-.11, .49, .62, .040], [-.05, .30, .65, .030], [-.16, .10, .63, .036],
    [-.06, -.12, .58, .026], [-.10, -.34, .50, .032], [.04, .38, .60, .024],
  ] as const, [])

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => {
      heart.dispose()
      scar.dispose()
      filaments.forEach((geometry) => geometry.dispose())
      field.dispose()
    }
  }, [field, filaments, heart, scar])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion.current) return
    const t = clock.elapsedTime
    root.current.rotation.y = -.10 + Math.sin(t * .17) * .035
    root.current.rotation.z = -.045 + Math.sin(t * .21) * .010
    const pulse = 1 + Math.sin(t * .70) * .007
    root.current.scale.set(1.30 * pulse, 1.30 * pulse, 1.22 * pulse)
    root.current.position.y = y + 1.04 + Math.sin(t * .31) * .014
    if (fieldRef.current) fieldRef.current.rotation.y = t * .018
  })

  return <group ref={root} position={[ORB.x, y + 1.04, ORB.z]} rotation={[.02, -.10, -.045]} scale={[1.30, 1.30, 1.22]} name="home-v253-literal-living-memory-heart" userData={{ artRevision: 'v253-continuous-clefted-heart-sanctuary', visualIntent: 'continuous-asymmetric-living-heart-with-readable-cleft-taper-embedded-history-and-grounded-memory-roots' }}>
    <mesh geometry={heart} raycast={() => null} receiveShadow castShadow>
      <meshStandardMaterial vertexColors color="#ffffff" emissive="#2a1318" emissiveIntensity={.075} roughness={.69} metalness={0} />
    </mesh>
    <mesh geometry={scar} raycast={() => null}>
      <meshStandardMaterial color="#d49a80" emissive="#9a554a" emissiveIntensity={.24} roughness={.60} metalness={0} />
    </mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={filamentPalette[index % filamentPalette.length]} emissive={filamentPalette[index % filamentPalette.length]} emissiveIntensity={.16} transparent opacity={.64} roughness={.62} metalness={0} depthWrite={false} />
    </mesh>)}
    {memoryNodes.map(([x, yy, z, scale], index) => <mesh key={`node-${index}`} position={[x, yy, z]} scale={scale} raycast={() => null}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshStandardMaterial color={index % 2 ? '#d48b70' : '#e3ab80'} emissive={index % 2 ? '#8d4b43' : '#a9624f'} emissiveIntensity={.48} roughness={.48} metalness={0} />
    </mesh>)}
    <points ref={fieldRef} geometry={field} raycast={() => null}>
      <pointsMaterial vertexColors size={.027} sizeAttenuation transparent opacity={.54} depthWrite={false} />
    </points>
    <pointLight position={[-.30, .46, .84]} color="#d69b7f" intensity={.62} distance={2.8} decay={2} />
    <pointLight position={[.38, .18, .72]} color="#d08b72" intensity={.28} distance={2.4} decay={2} />
  </group>
}

function GroundedOrbRootsV253() {
  const y = height(ORB.x, ORB.z)
  const roots = useMemo(rootTendrilsV253, [])
  useEffect(() => () => roots.forEach((geometry) => geometry.dispose()), [roots])

  return <group position={[ORB.x, y + .015, ORB.z]} name="home-v253-orb-grounded-memory-roots" userData={{ visualOnly: true }}>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={index % 3 === 0 ? '#5b4038' : '#38433b'} emissive={index % 3 === 0 ? '#3a211f' : '#17251f'} emissiveIntensity={.08} roughness={.92} metalness={0} />
    </mesh>)}
  </group>
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

  return <group name="home-v253-authored-sanctuary-dressing" userData={{ visualOnly: true, interactionOwner: false, composition: 'layered-lantern-grove-cairn-path' }}>
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
 * Final Home visual ownership guard.
 *
 * Interaction remains on the established V226 destination groups while their
 * superseded rendered shells are removed. Hidden predecessor meshes also lose
 * raycast authority so invisible geometry cannot steal pointer/touch hits.
 * V234 scan sheets are suppressed while their sculpted support geometry,
 * apertures and authored lighting remain.
 *
 * V253 replaces the rejected V252 prototype dressing and cool surface patches
 * with one continuous, deeply clefted and strongly tapered living-memory heart.
 * The history scar, branching traces and memory nodes hug the tissue, while a
 * layered lantern grove, path stones, cairns and fireflies anchor the Orb in
 * the authored world. Every added surface is visual-only and cannot take
 * navigation or pointer ownership from governed semantic controls.
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
    <GroundedOrbRootsV253 />
    <LiteralOrbAuthorityV253 />
  </>
}
