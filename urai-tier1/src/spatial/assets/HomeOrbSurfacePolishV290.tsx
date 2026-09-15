'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { height } from '../layout/HomeWorldProductionV223Geometry'

type V3 = [number, number, number]

type ShellSpec = {
  readonly position: V3
  readonly rotation: V3
  readonly scale: V3
  readonly seed: number
  readonly tint: string
}

const COMPANION_X = 1.02
const COMPANION_Z = .72

const shellSpecs: readonly ShellSpec[] = [
  { position: [-.58, .13, .02], rotation: [.10, -.24, .22], scale: [.58, 1.10, .48], seed: 1.3, tint: '#a29d90' },
  { position: [-.26, .88, -.03], rotation: [.22, .08, .42], scale: [.64, .34, .40], seed: 2.1, tint: '#aaa08d' },
  { position: [.47, .48, -.10], rotation: [-.20, .43, -.34], scale: [.46, .64, .38], seed: 3.7, tint: '#948f85' },
  { position: [.54, -.39, .07], rotation: [.15, -.34, .17], scale: [.50, .74, .42], seed: 4.6, tint: '#a59a87' },
  { position: [.03, -.82, .03], rotation: [-.08, .20, -.17], scale: [.66, .33, .47], seed: 5.8, tint: '#928b7e' },
  { position: [-.06, .01, -.43], rotation: [.02, .04, .08], scale: [.72, .84, .20], seed: 6.9, tint: '#77766f' },
  { position: [-.35, -.42, .20], rotation: [.13, -.38, .29], scale: [.45, .52, .29], seed: 8.2, tint: '#a29989' },
  { position: [.10, .80, .17], rotation: [-.14, .35, -.12], scale: [.27, .46, .24], seed: 9.4, tint: '#8f887d' },
]

function hashWave(seed: number, x: number, y: number, z: number) {
  return Math.sin(x * (4.7 + seed * .13) + y * 3.9 - z * 5.3 + seed * 4.91) * .52
    + Math.sin(x * 11.3 - y * (8.4 + seed * .07) + z * 9.1 - seed * 2.17) * .21
    + Math.sin((x + y - z) * 22.7 + seed * 8.31) * .07
}

function makeSmoothMineralShell(seed: number, mobile: boolean) {
  const widthSegments = mobile ? 40 : 64
  const heightSegments = mobile ? 28 : 44
  const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const graphite = new THREE.Color('#30322f')
  const mineral = new THREE.Color('#56544c')
  const bronze = new THREE.Color('#6e5a46')
  const ash = new THREE.Color('#8a8174')
  const crevice = new THREE.Color('#1a1c1a')

  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const length = Math.max(.001, Math.hypot(x, y, z))
    const nx = x / length
    const ny = y / length
    const nz = z / length
    const broad = hashWave(seed, nx * .55, ny * .55, nz * .55)
    const grain = hashWave(seed + 4.2, nx * 1.7, ny * 1.7, nz * 1.7)
    const strata = Math.sin((ny * 7.6 + nx * 2.1 - nz * 1.3 + seed) * 1.3)
    const chipBand = Math.abs(Math.sin((nx * 3.7 - ny * 5.1 + nz * 2.8 + seed * .6) * 2.0))
    const chip = Math.pow(Math.max(0, chipBand - .83) / .17, 2.4)
    const cavityBias = THREE.MathUtils.clamp((-nz + .18) * .34, 0, 1)
    const radial = .935 + broad * .070 + grain * .022 + strata * .008 - chip * .018
    const sideCompression = .82 + broad * .022

    position.setXYZ(
      index,
      nx * radial * (1 + ny * .025),
      ny * radial * (1 + broad * .018),
      nz * radial * sideCompression,
    )

    const exposed = THREE.MathUtils.smoothstep(nz, -.62, .78)
    const abrasion = THREE.MathUtils.clamp(Math.abs(grain) * .74 + chip * .52, 0, 1)
    const color = graphite.clone()
      .lerp(mineral, .32 + exposed * .28)
      .lerp(bronze, .035 + Math.max(0, broad) * .16 + Math.max(0, strata) * .028)
      .lerp(ash, abrasion * .09)
      .lerp(crevice, cavityBias * .10 + chip * .10)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * V290 shell polish replaces only the coarse visible shell surface. V286 still
 * owns the distributed internal memory world, state lighting, field, ground
 * traces, and timing. The hidden semantic companion still owns interaction.
 */
export function HomeOrbSurfacePolishV290() {
  const reducedMotion = useReducedMotion()
  const { size } = useThree()
  const portrait = size.height > size.width
  const mobile = size.width < 720
  const root = useRef<THREE.Group>(null)
  const plateRefs = useRef<Array<THREE.Mesh | null>>([])
  const groundY = height(COMPANION_X, COMPANION_Z)
  const geometries = useMemo(() => shellSpecs.map((spec) => makeSmoothMineralShell(spec.seed, mobile)), [mobile])

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime
    plateRefs.current.forEach((mesh, index) => {
      if (!mesh) return
      const spec = shellSpecs[index]
      const phase = index * 1.17
      const activity = reducedMotion ? 0 : 1
      mesh.position.y = spec.position[1] + Math.sin(t * (.10 + index * .006) + phase) * .0045 * activity
      mesh.rotation.x = spec.rotation[0] + Math.sin(t * (.08 + index * .004) + phase * .7) * .004 * activity
      mesh.rotation.z = spec.rotation[2] + Math.cos(t * (.09 + index * .005) + phase) * .005 * activity
    })
    if (root.current) root.current.rotation.y = -.18 + (reducedMotion ? 0 : Math.sin(t * .055) * .004)
  })

  const shellScale: V3 = portrait ? [1.38, 1.44, 1.30] : [1.18, 1.24, 1.10]
  const centerY = groundY + (portrait ? 1.15 : 1.12)

  return <group
    ref={root}
    name="home-v290-biomorphic-shell-authority"
    position={[COMPANION_X, centerY, COMPANION_Z]}
    rotation={[.055, -.18, -.055]}
    scale={shellScale}
    userData={{
      artRevision: 'v290-smooth-fractured-mineral-shell',
      visualOnly: true,
      interactionOwner: false,
      materialLanguage: 'opaque-high-roughness-weathered-mineral',
      silhouetteLanguage: 'asymmetric-fractured-reliquary',
    }}
  >
    {shellSpecs.map((spec, index) => <mesh
      key={`v290-shell-${index}`}
      ref={(node) => { plateRefs.current[index] = node }}
      geometry={geometries[index]}
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
      raycast={() => null}
      castShadow
      receiveShadow
      name={`home-v290-weathered-mineral-shell-${index}`}
    >
      <meshStandardMaterial
        vertexColors
        color={spec.tint}
        emissive="#171713"
        emissiveIntensity={.018}
        roughness={.91 - (index % 3) * .025}
        metalness={index % 4 === 0 ? .018 : .004}
        envMapIntensity={.58}
        dithering
      />
    </mesh>)}
  </group>
}
