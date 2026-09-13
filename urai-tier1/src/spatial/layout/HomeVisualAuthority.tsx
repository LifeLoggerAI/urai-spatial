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
  const geometry = new THREE.SphereGeometry(1, 76, 56)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deepTissue = new THREE.Color('#17342f')
  const livingTissue = new THREE.Color('#547b6f')
  const liftedTissue = new THREE.Color('#8aa38d')
  const rememberedTissue = new THREE.Color('#b98b6d')

  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index)
    const ny = position.getY(index)
    const nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.10, .92)
    const lower = THREE.MathUtils.smoothstep(-ny, .02, .98)
    const lobeBand = Math.exp(-(((ny - .48) / .43) ** 2)) * upper
    const side = Math.abs(nx) < .015 ? (Math.sin(angle) >= 0 ? 1 : -1) : Math.sign(nx)

    const cleftAxis = (nx + .015) * .98 + (nz - .09) * .15
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .016) * THREE.MathUtils.smoothstep(ny, .14, .94)
    const leftLobe = Math.exp(-(((nx + .36) / .39) ** 2 + ((nz - .03) / .62) ** 2)) * upper
    const rightLobe = Math.exp(-(((nx - .27) / .47) ** 2 + ((nz + .03) / .64) ** 2)) * upper
    const rightNotch = Math.exp(-(((nx - .50) / .22) ** 2 + ((nz - .06) / .30) ** 2)) * upper
    const anteriorFold = Math.exp(-(((nz - .56) / .22) ** 2 + ((nx + .08) / .54) ** 2)) * (.20 + upper * .80)
    const historyFold = Math.exp(-(((nx + .10) / .20) ** 2 + ((nz - .45) / .21) ** 2)) * (.20 + upper * .80)
    const skin = .040 * Math.sin(angle * 3.2 + ny * 6.1) + .018 * Math.sin(angle * 8.1 - ny * 10.8)
    const strongLowerTaper = THREE.MathUtils.lerp(.08, 1, THREE.MathUtils.smoothstep(ny, -.98, .18))
    const radial = 1 + skin + .24 * leftLobe + .12 * rightLobe - .18 * rightNotch + .12 * anteriorFold

    let x = nx * radial * .66 * strongLowerTaper
    x += side * lobeBand * (.12 + .10 * Math.abs(nz))
    x += ny * .11 - .08 - upper * .025 - lower * .12
    let z = nz * radial * .66 * strongLowerTaper + .10 * anteriorFold - .045 * rightNotch

    const twist = (ny + .04) * .32
    const cos = Math.cos(twist)
    const sin = Math.sin(twist)
    const tx = x * cos - z * sin
    const tz = x * sin + z * cos
    x = tx
    z = tz

    let y = ny * 1.18 - .53 * cleft + .19 * leftLobe + .09 * rightLobe - .06 * rightNotch + .08 * anteriorFold
    y -= lower * (.22 + .24 * lower)
    position.setXYZ(index, x, y, z)

    const altitude = THREE.MathUtils.clamp((y + 1.35) / 2.62, 0, 1)
    const remembered = THREE.MathUtils.clamp(cleft * .58 + historyFold + anteriorFold * .22, 0, 1)
    const tissueNoise = THREE.MathUtils.clamp(.5 + .5 * Math.sin(angle * 4.3 + ny * 8.6 + Math.sin(angle * 2.1)), 0, 1)
    const color = deepTissue.clone()
      .lerp(livingTissue, .34 + altitude * .30)
      .lerp(liftedTissue, tissueNoise * .18 + upper * .08)
      .lerp(rememberedTissue, remembered * .40)
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
    new THREE.Vector3(-.04, .77, .66),
    new THREE.Vector3(-.16, .58, .69),
    new THREE.Vector3(-.08, .37, .71),
    new THREE.Vector3(-.17, .14, .68),
    new THREE.Vector3(-.06, -.08, .65),
    new THREE.Vector3(-.12, -.31, .58),
    new THREE.Vector3(-.04, -.53, .46),
  ])
  return new THREE.TubeGeometry(curve, 52, .016, 7, false)
}

function filamentTubesV251() {
  return Array.from({ length: 10 }, (_, trace) => {
    const points: THREE.Vector3[] = []
    const direction = trace < 5 ? -1 : 1
    const branch = trace < 5 ? trace : trace - 5
    for (let step = 0; step <= 24; step++) {
      const t = step / 24
      const startY = -.46 + (branch % 3) * .09
      const endY = .56 - (branch % 2) * .12
      const y = THREE.MathUtils.lerp(startY, endY, t)
      const divergence = direction * t * (.10 + branch * .045)
      const x = -.07 + divergence + Math.sin(t * 7.2 + trace * .77) * (.018 + t * .014)
      const emergence = Math.sin(t * Math.PI * 2 + trace * .73)
      const z = .53 + emergence * .12 + Math.sin(t * 3.5 + trace) * .025
      points.push(new THREE.Vector3(x, y, z))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, .0055 + (trace % 3) * .0015, 6, false)
  })
}

function memoryFieldV251() {
  const count = 320
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#79b7a8')
  const warm = new THREE.Color('#d0a47b')
  for (let index = 0; index < count; index++) {
    const historyPoint = index < 118
    let x: number
    let y: number
    let z: number
    if (historyPoint) {
      const t = (index + .5) / 118
      y = -.55 + t * 1.35
      x = -.10 + Math.sin(index * 1.73) * (.055 + .035 * Math.sin(t * Math.PI))
      z = .48 + Math.cos(index * 2.11) * .20 + Math.sin(t * 7.4) * .045
    } else {
      const t = (index - 118 + .5) / (count - 118)
      y = -.90 + ((index * 31) % (count - 118)) / (count - 119) * 1.80
      const angle = index * 2.39996323 + .24 * Math.sin(index * .19)
      const radius = .67 + Math.pow(t, .66) * .40
      x = Math.cos(angle) * radius * (.80 - .10 * Math.abs(y)) - .05
      z = Math.sin(angle) * radius * .42 + .08 * Math.sin(index * .43)
    }
    positions.set([x, y, z], index * 3)
    const warmMix = historyPoint ? .42 + .40 * ((index % 11) / 10) : .12 + .38 * ((index % 19) / 18)
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
  const scar = useMemo(scarTubeV251, [])
  const filaments = useMemo(filamentTubesV251, [])
  const field = useMemo(memoryFieldV251, [])
  const filamentPalette = ['#82aa9f', '#b99573', '#739b91', '#c1a17d', '#8eb5a8']

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
    root.current.rotation.y = -.12 + Math.sin(t * .17) * .025
    root.current.rotation.z = -.055 + Math.sin(t * .21) * .008
    root.current.position.y = y + .94 + Math.sin(t * .31) * .015
    if (fieldRef.current) fieldRef.current.rotation.y = t * .020
  })

  return <group ref={root} position={[ORB.x, y + .94, ORB.z]} rotation={[.025, -.12, -.055]} scale={[1.16, 1.16, 1.08]} name="home-v251-literal-living-memory-heart" userData={{ artRevision: 'v251-literal-heart-history-authority', visualIntent: 'unmistakable-asymmetric-living-heart-with-embedded-branching-history-and-localized-memory-field' }}>
    <mesh geometry={heart} raycast={() => null} receiveShadow>
      <meshStandardMaterial vertexColors color="#66887d" emissive="#183d37" emissiveIntensity={.07} roughness={.76} metalness={0} />
    </mesh>
    <mesh geometry={scar} raycast={() => null}>
      <meshStandardMaterial color="#c7a080" emissive="#6f4a3f" emissiveIntensity={.17} roughness={.62} metalness={0} />
    </mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={filamentPalette[index % filamentPalette.length]} emissive={filamentPalette[index % filamentPalette.length]} emissiveIntensity={.16} transparent opacity={.54} roughness={.68} metalness={0} depthWrite={false} />
    </mesh>)}
    <points ref={fieldRef} geometry={field} raycast={() => null}>
      <pointsMaterial vertexColors size={.031} sizeAttenuation transparent opacity={.66} depthWrite={false} />
    </points>
    <pointLight position={[-.40, .48, .76]} color="#d0a47d" intensity={.46} distance={2.3} decay={2} />
    <pointLight position={[.36, .18, .64]} color="#82b9aa" intensity={.34} distance={2.0} decay={2} />
    <pointLight position={[-.08, -.38, .52]} color="#927b65" intensity={.18} distance={1.4} decay={2} />
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
 * interaction owner. V251 deepens the two-lobe cleft/taper silhouette, embeds
 * thinner branching history filaments through the tissue, and concentrates the
 * localized memory field around scar history so those features survive literal
 * desktop/mobile/reduced-motion inspection without reverting to crystal-shell,
 * wireframe, generic glowing-sphere, or cable-strip language.
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
