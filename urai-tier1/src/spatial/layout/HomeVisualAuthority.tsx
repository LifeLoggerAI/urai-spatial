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

function livingHeartGeometryV252() {
  const geometry = new THREE.SphereGeometry(1, 88, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deepTissue = new THREE.Color('#281c22')
  const livingTissue = new THREE.Color('#65413f')
  const liftedTissue = new THREE.Color('#8c6255')
  const rememberedTissue = new THREE.Color('#b9856c')
  const cooledMemory = new THREE.Color('#4c6c63')

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

function scarTubeV252() {
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

function filamentTubesV252() {
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

function rootTendrilsV252() {
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

function memoryFieldV252() {
  const count = 280
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#76a99d')
  const warm = new THREE.Color('#d19a78')
  const ember = new THREE.Color('#e0b08a')

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

function LiteralOrbAuthorityV252() {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const reducedMotion = useRef(false)
  const y = height(ORB.x, ORB.z)
  const heart = useMemo(livingHeartGeometryV252, [])
  const scar = useMemo(scarTubeV252, [])
  const filaments = useMemo(filamentTubesV252, [])
  const field = useMemo(memoryFieldV252, [])
  const filamentPalette = ['#b47d67', '#75998f', '#c18d70', '#668c83', '#d0a07a', '#8a6a62']
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

  return <group ref={root} position={[ORB.x, y + 1.04, ORB.z]} rotation={[.02, -.10, -.045]} scale={[1.30, 1.30, 1.22]} name="home-v252-literal-living-memory-heart" userData={{ artRevision: 'v252-continuous-clefted-heart-sanctuary', visualIntent: 'continuous-asymmetric-living-heart-with-readable-cleft-taper-embedded-history-and-grounded-memory-roots' }}>
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
      <meshStandardMaterial color={index % 2 ? '#78a69b' : '#d6a17e'} emissive={index % 2 ? '#4e8177' : '#a9624f'} emissiveIntensity={.48} roughness={.48} metalness={0} />
    </mesh>)}
    <points ref={fieldRef} geometry={field} raycast={() => null}>
      <pointsMaterial vertexColors size={.027} sizeAttenuation transparent opacity={.54} depthWrite={false} />
    </points>
    <pointLight position={[-.30, .46, .84]} color="#d69b7f" intensity={.62} distance={2.8} decay={2} />
    <pointLight position={[.38, .18, .72]} color="#72a89d" intensity={.36} distance={2.4} decay={2} />
  </group>
}

function GroundedOrbRootsV252() {
  const y = height(ORB.x, ORB.z)
  const roots = useMemo(rootTendrilsV252, [])
  useEffect(() => () => roots.forEach((geometry) => geometry.dispose()), [roots])

  return <group position={[ORB.x, y + .015, ORB.z]} name="home-v252-orb-grounded-memory-roots" userData={{ visualOnly: true }}>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={index % 3 === 0 ? '#5b4038' : '#38433b'} emissive={index % 3 === 0 ? '#3a211f' : '#17251f'} emissiveIntensity={.08} roughness={.92} metalness={0} />
    </mesh>)}
  </group>
}

function SanctuaryDressingV252() {
  const lanternStem = useMemo(() => new THREE.CylinderGeometry(.09, .14, .54, 8), [])
  const lanternCore = useMemo(() => new THREE.DodecahedronGeometry(.095, 0), [])
  const standingStone = useMemo(() => new THREE.DodecahedronGeometry(.72, 1), [])
  const leftSpire = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.95, height(-4.95, -11.2) + .10, -11.2),
    new THREE.Vector3(-4.58, 1.10, -10.9),
    new THREE.Vector3(-4.18, 2.25, -10.4),
    new THREE.Vector3(-3.52, 3.22, -9.75),
    new THREE.Vector3(-2.86, 3.70, -9.20),
  ]), 52, .13, 7, false), [])
  const rightSpire = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.28, height(5.28, -11.55) + .10, -11.55),
    new THREE.Vector3(4.92, 1.03, -11.15),
    new THREE.Vector3(4.55, 2.02, -10.55),
    new THREE.Vector3(4.02, 2.86, -9.92),
    new THREE.Vector3(3.47, 3.28, -9.36),
  ]), 52, .12, 7, false), [])

  const lanterns = useMemo(() => [
    [-2.20, 2.20, .96], [2.18, 1.38, .92], [-2.48, -.55, .92], [2.42, -1.32, 1.02],
    [-2.70, -3.48, .96], [2.72, -4.22, 1.05], [-2.95, -5.88, .92], [2.98, -6.40, .98],
  ] as const, [])
  const stones = useMemo(() => [
    [-5.72, 1.45, .62, 1.34, .72, -.20], [5.88, .62, .72, 1.48, .70, .24],
    [-6.20, -2.10, .66, 1.72, .75, .32], [6.34, -2.92, .58, 1.30, .66, -.25],
    [-5.62, -5.10, .54, 1.56, .64, .17], [5.74, -5.84, .62, 1.66, .72, -.18],
    [-5.10, -8.82, .72, 2.02, .80, .22], [5.32, -9.18, .64, 1.88, .74, -.26],
    [-4.30, -12.18, .58, 1.56, .64, .15], [4.60, -12.48, .66, 1.72, .72, -.12],
  ] as const, [])

  useEffect(() => () => {
    lanternStem.dispose()
    lanternCore.dispose()
    standingStone.dispose()
    leftSpire.dispose()
    rightSpire.dispose()
  }, [lanternCore, lanternStem, leftSpire, rightSpire, standingStone])

  return <group name="home-v252-authored-sanctuary-dressing" userData={{ visualOnly: true, interactionOwner: false }}>
    {lanterns.map(([x, z, scale], index) => {
      const y = height(x, z)
      return <group key={`lantern-${index}`} position={[x, y, z]} scale={scale}>
        <mesh geometry={lanternStem} position={[0, .27, 0]} rotation={[.02, 0, index % 2 ? .05 : -.04]} raycast={() => null} castShadow>
          <meshStandardMaterial color="#403b32" roughness={.94} metalness={0} />
        </mesh>
        <mesh geometry={lanternCore} position={[0, .66, 0]} raycast={() => null}>
          <meshStandardMaterial color={index % 2 ? '#d3a27a' : '#76a69b'} emissive={index % 2 ? '#9c5d46' : '#42776f'} emissiveIntensity={.58} roughness={.48} metalness={0} />
        </mesh>
        <pointLight position={[0, .68, 0]} color={index % 2 ? '#dba37d' : '#78aea2'} intensity={.34} distance={2.65} decay={2} />
      </group>
    })}

    {stones.map(([x, z, sx, sy, sz, rz], index) => {
      const y = height(x, z)
      return <mesh key={`stone-${index}`} geometry={standingStone} position={[x, y + sy * .48, z]} scale={[sx, sy, sz]} rotation={[.03 * (index % 3), .18 * index, rz]} raycast={() => null} castShadow receiveShadow>
        <meshStandardMaterial color={index % 2 ? '#3a443a' : '#454238'} roughness={.96} metalness={0} />
      </mesh>
    })}

    <mesh geometry={leftSpire} raycast={() => null} castShadow>
      <meshStandardMaterial color="#323d35" emissive="#101a16" emissiveIntensity={.06} roughness={.95} metalness={0} />
    </mesh>
    <mesh geometry={rightSpire} raycast={() => null} castShadow>
      <meshStandardMaterial color="#3f4036" emissive="#1b1814" emissiveIntensity={.05} roughness={.95} metalness={0} />
    </mesh>

    <pointLight position={[0, 1.12, -4.45]} color="#c38c6f" intensity={.72} distance={10.5} decay={2} />
    <pointLight position={[-3.9, 1.18, -8.9]} color="#789b8e" intensity={.44} distance={7.0} decay={2} />
    <pointLight position={[4.0, 1.34, -9.2]} color="#b98669" intensity={.42} distance={7.2} decay={2} />
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
 * V252 replaces the rejected segmented teal V251 Orb with one continuous,
 * deeply clefted and strongly tapered living-memory heart. The history scar,
 * branching traces and memory nodes hug the tissue, while grounded root
 * tendrils and visual-only sanctuary landmarks anchor the Orb in the authored
 * world. Every added surface is visual-only and cannot take navigation or
 * pointer ownership from the governed semantic Orb and destination controls.
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
    <SanctuaryDressingV252 />
    <GroundedOrbRootsV252 />
    <LiteralOrbAuthorityV252 />
  </>
}
