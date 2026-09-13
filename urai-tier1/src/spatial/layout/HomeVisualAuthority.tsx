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

function livingHeartGeometryV250() {
  const geometry = new THREE.SphereGeometry(1, 72, 52)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const base = new THREE.Color('#233b37')
  const tissue = new THREE.Color('#4d6f68')
  const history = new THREE.Color('#8d7466')

  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index)
    const ny = position.getY(index)
    const nz = position.getZ(index)
    const upper = THREE.MathUtils.smoothstep(ny, -.15, .9)
    const lower = THREE.MathUtils.smoothstep(-ny, .05, .98)
    const angle = Math.atan2(nz, nx)

    const cleftAxis = (nx + .04) * .92 + (nz - .10) * .32
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .022) * upper
    const leftLobe = Math.exp(-(((nx + .38) / .45) ** 2 + ((nz - .10) / .60) ** 2)) * upper
    const rightLobe = Math.exp(-(((nx - .28) / .58) ** 2 + ((nz + .08) / .64) ** 2)) * upper
    const rightNotch = Math.exp(-(((nx - .48) / .24) ** 2 + ((nz - .12) / .32) ** 2)) * upper
    const anteriorFold = Math.exp(-(((nz - .58) / .21) ** 2 + ((nx + .08) / .58) ** 2)) * (.25 + upper * .75)
    const historyFold = Math.exp(-(((nx + .12) / .22) ** 2 + ((nz - .48) / .18) ** 2)) * (.25 + upper * .75)
    const skin = .055 * Math.sin(angle * 3.15 + ny * 5.7) + .022 * Math.sin(angle * 7.4 - ny * 10.1)
    const taper = THREE.MathUtils.lerp(.22, 1, THREE.MathUtils.smoothstep(ny, -.94, -.02))
    const radial = 1 + skin + .26 * leftLobe + .10 * rightLobe - .18 * rightNotch + .18 * anteriorFold

    let x = nx * radial * .68 * taper + ny * .16 - .12 - upper * .055
    let z = nz * radial * .69 * taper + .13 * anteriorFold - .055 * rightNotch
    const twist = (ny + .06) * .48
    const cos = Math.cos(twist)
    const sin = Math.sin(twist)
    const tx = x * cos - z * sin
    const tz = x * sin + z * cos
    x = tx - lower * .10
    z = tz

    let y = ny * 1.22 - .34 * cleft + .17 * leftLobe - .07 * rightNotch + .10 * anteriorFold
    y -= lower * (.20 + .19 * lower)
    position.setXYZ(index, x, y, z)

    const altitude = THREE.MathUtils.clamp((y + 1.35) / 2.65, 0, 1)
    const remembered = THREE.MathUtils.clamp(cleft * .65 + historyFold + anteriorFold * .24, 0, 1)
    const color = base.clone().lerp(tissue, .24 + altitude * .42).lerp(history, remembered * .46)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function scarTubeV250() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.05, .79, .72),
    new THREE.Vector3(-.18, .57, .76),
    new THREE.Vector3(-.07, .34, .78),
    new THREE.Vector3(-.17, .10, .75),
    new THREE.Vector3(-.05, -.13, .70),
    new THREE.Vector3(-.12, -.37, .62),
    new THREE.Vector3(-.04, -.60, .49),
  ])
  return new THREE.TubeGeometry(curve, 48, .024, 7, false)
}

function filamentTubesV250() {
  return Array.from({ length: 7 }, (_, trace) => {
    const points: THREE.Vector3[] = []
    for (let step = 0; step <= 20; step++) {
      const t = step / 20
      const y = -.62 + t * 1.27
      const angle = -.95 + trace * .30 + t * (.78 + trace * .035) + .11 * Math.sin(t * 8 + trace)
      const envelope = .18 + .20 * Math.sin(t * Math.PI)
      points.push(new THREE.Vector3(
        Math.cos(angle) * envelope + (trace - 3) * .018 - .05,
        y,
        .72 + Math.sin(angle) * .10,
      ))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 42, .010 + (trace % 3) * .003, 6, false)
  })
}

function memoryFieldV250() {
  const count = 280
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#86c9bd')
  const warm = new THREE.Color('#d8b78e')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const y = -.92 + ((index * 31) % count) / (count - 1) * 1.84
    const angle = index * 2.39996323 + .28 * Math.sin(index * .19)
    const radius = .72 + Math.pow(t, .62) * .46
    const x = Math.cos(angle) * radius * (.82 - .12 * Math.abs(y)) - .06
    const z = Math.sin(angle) * radius * .46 + .10 * Math.sin(index * .43)
    positions.set([x, y, z], index * 3)
    const color = cool.clone().lerp(warm, .12 + .55 * ((index % 19) / 18))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function LiteralOrbAuthorityV250() {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const reducedMotion = useRef(false)
  const y = height(ORB.x, ORB.z)
  const heart = useMemo(livingHeartGeometryV250, [])
  const scar = useMemo(scarTubeV250, [])
  const filaments = useMemo(filamentTubesV250, [])
  const field = useMemo(memoryFieldV250, [])

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
    root.current.rotation.y = -.28 + Math.sin(t * .17) * .035
    root.current.rotation.z = -.09 + Math.sin(t * .21) * .010
    root.current.position.y = y + .94 + Math.sin(t * .31) * .018
    if (fieldRef.current) fieldRef.current.rotation.y = t * .025
  })

  return <group ref={root} position={[ORB.x, y + .94, ORB.z]} rotation={[.04, -.28, -.09]} scale={[1.13, 1.18, 1.10]} name="home-v250-literal-living-memory-heart" userData={{ artRevision: 'v250-literal-history-authority', visualIntent: 'asymmetric-living-memory-heart-with-externalized-scar-filaments-and-localized-memory-field' }}>
    <mesh geometry={heart} raycast={() => null} receiveShadow>
      <meshStandardMaterial vertexColors color="#55756d" emissive="#244d48" emissiveIntensity={.11} roughness={.84} metalness={0} />
    </mesh>
    <mesh geometry={scar} raycast={() => null}>
      <meshStandardMaterial color="#d6bca6" emissive="#8d6054" emissiveIntensity={.34} roughness={.56} metalness={0} />
    </mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshBasicMaterial color={index % 2 ? '#b7d9cf' : '#d7c39e'} transparent opacity={.72} />
    </mesh>)}
    <points ref={fieldRef} geometry={field} raycast={() => null}>
      <pointsMaterial vertexColors size={.036} sizeAttenuation transparent opacity={.62} depthWrite={false} />
    </points>
    <pointLight position={[-.34, .30, .80]} color="#d6b08d" intensity={.42} distance={2.4} decay={2} />
    <pointLight position={[.42, -.10, .52]} color="#73bbae" intensity={.28} distance={2.2} decay={2} />
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
 * The V250 living-memory heart is a visual-only outer authority: raycasting is
 * disabled on every added surface so the existing V249 Orb remains the sole
 * interaction owner. This keeps navigation semantics unchanged while making
 * history, scar, filaments and the localized memory field legible in retained
 * desktop/mobile/reduced-motion pixels.
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

  return <LiteralOrbAuthorityV250 />
}
