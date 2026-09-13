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

function livingHeartGeometryV251() {
  const geometry = new THREE.SphereGeometry(1, 72, 52)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deepTissue = new THREE.Color('#203a34')
  const livingTissue = new THREE.Color('#4b6d62')
  const liftedTissue = new THREE.Color('#70897a')
  const rememberedTissue = new THREE.Color('#9a735f')

  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index)
    const ny = position.getY(index)
    const nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, .16, .94)
    const lower = THREE.MathUtils.smoothstep(-ny, .02, .98)
    const front = THREE.MathUtils.smoothstep(nz, -.12, .92)
    const taper = THREE.MathUtils.lerp(.15, 1, THREE.MathUtils.smoothstep(ny, -.98, .12))
    const shoulderNarrow = THREE.MathUtils.lerp(1, .61, upper)
    const skin = .026 * Math.sin(angle * 3.1 + ny * 5.4) + .011 * Math.sin(angle * 7.6 - ny * 9.2)
    const memoryFold = Math.exp(-(((nx + .07) / .29) ** 2 + ((nz - .50) / .24) ** 2)) * (.28 + front * .72)
    const radial = 1 + skin + memoryFold * .045

    let x = nx * radial * .70 * taper * shoulderNarrow
    x += ny * .035 - lower * .018
    let z = nz * radial * .57 * taper * (1 - upper * .08)
    z += memoryFold * .018
    let y = ny * 1.04
    y -= lower * (.20 + .13 * lower)
    y -= upper * .075
    position.setXYZ(index, x, y, z)

    const altitude = THREE.MathUtils.clamp((y + 1.26) / 2.34, 0, 1)
    const tissueNoise = THREE.MathUtils.clamp(.5 + .5 * Math.sin(angle * 4.0 + ny * 7.6), 0, 1)
    const remembered = THREE.MathUtils.clamp(memoryFold * .58 + front * .09, 0, 1)
    const color = deepTissue.clone()
      .lerp(livingTissue, .36 + altitude * .22)
      .lerp(liftedTissue, tissueNoise * .10 + front * .05)
      .lerp(rememberedTissue, remembered * .22)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function scarTubeV251() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.07, .61, .50),
    new THREE.Vector3(-.13, .45, .54),
    new THREE.Vector3(-.08, .27, .56),
    new THREE.Vector3(-.14, .08, .55),
    new THREE.Vector3(-.07, -.11, .52),
    new THREE.Vector3(-.10, -.30, .46),
    new THREE.Vector3(-.04, -.47, .37),
  ])
  return new THREE.TubeGeometry(curve, 52, .009, 7, false)
}

function filamentTubesV251() {
  return Array.from({ length: 8 }, (_, trace) => {
    const points: THREE.Vector3[] = []
    const direction = trace < 4 ? -1 : 1
    const branch = trace < 4 ? trace : trace - 4
    for (let step = 0; step <= 22; step++) {
      const t = step / 22
      const startY = -.35 + (branch % 3) * .07
      const endY = .43 - (branch % 2) * .08
      const y = THREE.MathUtils.lerp(startY, endY, t)
      const divergence = direction * t * (.055 + branch * .026)
      const x = -.075 + divergence + Math.sin(t * 6.4 + trace * .71) * (.009 + t * .007)
      const z = .485 + Math.sin(t * Math.PI + trace * .48) * .030 + Math.sin(t * 4.0 + trace) * .008
      points.push(new THREE.Vector3(x, y, z))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 44, .0035 + (trace % 2) * .0008, 6, false)
  })
}

function memoryFieldV251() {
  const count = 240
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#6fa194')
  const warm = new THREE.Color('#b4876f')
  for (let index = 0; index < count; index++) {
    const historyPoint = index < 88
    let x: number
    let y: number
    let z: number
    if (historyPoint) {
      const t = (index + .5) / 88
      y = -.47 + t * 1.06
      x = -.08 + Math.sin(index * 1.61) * (.035 + .022 * Math.sin(t * Math.PI))
      z = .44 + Math.cos(index * 2.03) * .095 + Math.sin(t * 6.6) * .025
    } else {
      const t = (index - 88 + .5) / (count - 88)
      y = -.72 + ((index * 29) % (count - 88)) / (count - 89) * 1.44
      const orbit = index * 2.39996323 + .16 * Math.sin(index * .17)
      const radius = .58 + Math.pow(t, .70) * .30
      x = Math.cos(orbit) * radius * (.74 - .08 * Math.abs(y)) - .035
      z = Math.sin(orbit) * radius * .34 + .04 * Math.sin(index * .41)
    }
    positions.set([x, y, z], index * 3)
    const warmMix = historyPoint ? .34 + .34 * ((index % 9) / 8) : .10 + .25 * ((index % 17) / 16)
    const color = cool.clone().lerp(warm, warmMix)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function LiteralOrbAuthorityV251() {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const reducedMotion = useRef(false)
  const y = height(ORB.x, ORB.z)
  const heart = useMemo(livingHeartGeometryV251, [])
  const lobe = useMemo(() => new THREE.SphereGeometry(1, 64, 48), [])
  const scar = useMemo(scarTubeV251, [])
  const filaments = useMemo(filamentTubesV251, [])
  const field = useMemo(memoryFieldV251, [])
  const filamentPalette = ['#789d92', '#a37d69', '#6e9489', '#aa8870']

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => {
      heart.dispose()
      lobe.dispose()
      scar.dispose()
      filaments.forEach((geometry) => geometry.dispose())
      field.dispose()
    }
  }, [field, filaments, heart, lobe, scar])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion.current) return
    const t = clock.elapsedTime
    root.current.rotation.y = -.12 + Math.sin(t * .17) * .025
    root.current.rotation.z = -.055 + Math.sin(t * .21) * .008
    root.current.position.y = y + .94 + Math.sin(t * .31) * .015
    if (fieldRef.current) fieldRef.current.rotation.y = t * .020
  })

  return <group ref={root} position={[ORB.x, y + .94, ORB.z]} rotation={[.025, -.12, -.055]} scale={[1.16, 1.16, 1.08]} name="home-v251-literal-living-memory-heart" userData={{ artRevision: 'v251-literal-heart-history-authority', visualIntent: 'unmistakable-asymmetric-living-heart-with-embedded-branching-history-and-localized-memory-field' }}>
    <mesh geometry={heart} raycast={() => null} receiveShadow>
      <meshStandardMaterial vertexColors color="#6d7d72" emissive="#142e2a" emissiveIntensity={.045} roughness={.82} metalness={0} />
    </mesh>
    <mesh geometry={lobe} position={[-.27, .47, -.015]} rotation={[.02, .08, .14]} scale={[.48, .47, .43]} raycast={() => null} receiveShadow>
      <meshStandardMaterial color="#49695f" emissive="#17332e" emissiveIntensity={.045} roughness={.80} metalness={0} />
    </mesh>
    <mesh geometry={lobe} position={[.27, .43, .01]} rotation={[-.01, -.09, -.16]} scale={[.54, .49, .45]} raycast={() => null} receiveShadow>
      <meshStandardMaterial color="#3f6258" emissive="#13322c" emissiveIntensity={.05} roughness={.79} metalness={0} />
    </mesh>
    <mesh geometry={scar} raycast={() => null}>
      <meshStandardMaterial color="#b98c73" emissive="#5b4037" emissiveIntensity={.08} roughness={.72} metalness={0} />
    </mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={filamentPalette[index % filamentPalette.length]} emissive={filamentPalette[index % filamentPalette.length]} emissiveIntensity={.06} transparent opacity={.38} roughness={.76} metalness={0} depthWrite={false} />
    </mesh>)}
    <points ref={fieldRef} geometry={field} raycast={() => null}>
      <pointsMaterial vertexColors size={.022} sizeAttenuation transparent opacity={.46} depthWrite={false} />
    </points>
    <pointLight position={[-.35, .45, .70]} color="#b98d72" intensity={.28} distance={2.0} decay={2} />
    <pointLight position={[.32, .18, .60]} color="#78a99b" intensity={.20} distance={1.8} decay={2} />
    <pointLight position={[-.06, -.32, .46]} color="#806a5b" intensity={.10} distance={1.2} decay={2} />
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
 * The V251 living-memory heart is a visual-only outer authority: raycasting is
 * disabled on every added surface so the existing V249 Orb remains the sole
 * interaction owner. The literal-pixel polish keeps a compact tapered body and
 * two distinct asymmetric upper lobes instead of folding one sphere into a
 * handle-like cleft, keeps the history scar and branching filaments close to
 * the tissue, and quiets the memory field so no lower shield, rear loop, or
 * cable-bundle silhouette dominates desktop, mobile, or reduced motion.
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

  return <LiteralOrbAuthorityV251 />
}
