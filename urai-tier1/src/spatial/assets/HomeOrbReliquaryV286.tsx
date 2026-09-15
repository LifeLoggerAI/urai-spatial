'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { ORB, height } from '../layout/HomeWorldProductionV223Geometry'

type V3 = [number, number, number]
type ReliquaryStateVisual = {
  primary: string
  secondary: string
  field: string
  light: string
  shellEmissive: string
  activity: number
  fieldOpacity: number
}
type OrbFidelityTier = 'high' | 'balanced' | 'mobile'

type OrbFidelityProfile = {
  plateDetail: number
  filamentSegments: number
  filamentRadialSegments: number
  branchSegments: number
  branchRadialSegments: number
  nodeDetail: number
  fieldCount: number
  groundSegments: number
}

const stateVisualsV286: Record<OrbState, ReliquaryStateVisual> = {
  dormant: { primary: '#9a7656', secondary: '#687e7b', field: '#8d826e', light: '#b9875b', shellEmissive: '#161512', activity: .18, fieldOpacity: .10 },
  idle: { primary: '#d39a61', secondary: '#789391', field: '#c2a070', light: '#dfa66b', shellEmissive: '#201a13', activity: .42, fieldOpacity: .20 },
  attention: { primary: '#e0a461', secondary: '#8ba7a0', field: '#d5aa70', light: '#ecb06c', shellEmissive: '#2b2117', activity: .66, fieldOpacity: .28 },
  listening: { primary: '#8db9ad', secondary: '#6f8f9d', field: '#82a9a3', light: '#8ec0b4', shellEmissive: '#172120', activity: .50, fieldOpacity: .18 },
  thinking: { primary: '#a28aac', secondary: '#7696a4', field: '#9289a3', light: '#aa94b4', shellEmissive: '#211b29', activity: .72, fieldOpacity: .25 },
  speaking: { primary: '#e3aa68', secondary: '#c98559', field: '#d9a066', light: '#efb474', shellEmissive: '#2d2116', activity: .86, fieldOpacity: .32 },
  guiding: { primary: '#c6ad72', secondary: '#7ea08c', field: '#a6ab76', light: '#cbb87c', shellEmissive: '#252116', activity: .62, fieldOpacity: .24 },
  reflecting: { primary: '#9d8fa9', secondary: '#748d9c', field: '#8e879e', light: '#a797b1', shellEmissive: '#211d27', activity: .48, fieldOpacity: .20 },
  calming: { primary: '#9fb49d', secondary: '#789a93', field: '#91a793', light: '#a9bda5', shellEmissive: '#19201b', activity: .34, fieldOpacity: .16 },
  privacy: { primary: '#7ca1ae', secondary: '#6e8199', field: '#7d98a5', light: '#86a9b5', shellEmissive: '#172129', activity: .38, fieldOpacity: .16 },
  warning: { primary: '#d77e59', secondary: '#aa6853', field: '#bb7659', light: '#dc8561', shellEmissive: '#2c1814', activity: .82, fieldOpacity: .29 },
  transition: { primary: '#aa94b1', secondary: '#7898a1', field: '#918ba7', light: '#b09ab9', shellEmissive: '#221d29', activity: .68, fieldOpacity: .26 },
}

const plateSpecsV286: ReadonlyArray<{ position: V3; rotation: V3; scale: V3; seed: number; tint: string }> = [
  { position: [-.58, .13, .02], rotation: [.10, -.24, .22], scale: [.58, 1.10, .48], seed: 1.3, tint: '#a29d90' },
  { position: [-.26, .88, -.03], rotation: [.22, .08, .42], scale: [.64, .34, .40], seed: 2.1, tint: '#aaa08d' },
  { position: [.47, .48, -.10], rotation: [-.20, .43, -.34], scale: [.46, .64, .38], seed: 3.7, tint: '#948f85' },
  { position: [.54, -.39, .07], rotation: [.15, -.34, .17], scale: [.50, .74, .42], seed: 4.6, tint: '#a59a87' },
  { position: [.03, -.82, .03], rotation: [-.08, .20, -.17], scale: [.66, .33, .47], seed: 5.8, tint: '#928b7e' },
  { position: [-.06, .01, -.43], rotation: [.02, .04, .08], scale: [.72, .84, .20], seed: 6.9, tint: '#77766f' },
  { position: [-.35, -.42, .20], rotation: [.13, -.38, .29], scale: [.45, .52, .29], seed: 8.2, tint: '#a29989' },
  { position: [.10, .80, .17], rotation: [-.14, .35, -.12], scale: [.27, .46, .24], seed: 9.4, tint: '#8f887d' },
]

const nodeSpecsV286: ReadonlyArray<{ position: V3; scale: V3; rotation: V3; seed: number }> = [
  { position: [-.13, .52, .35], scale: [.085, .12, .075], rotation: [.2, .4, .1], seed: 2.3 },
  { position: [.17, .35, .31], scale: [.065, .09, .06], rotation: [-.1, .9, .2], seed: 3.8 },
  { position: [-.02, .11, .40], scale: [.10, .14, .08], rotation: [.3, -.4, .4], seed: 5.1 },
  { position: [.24, -.12, .34], scale: [.075, .105, .07], rotation: [-.2, .3, -.1], seed: 6.7 },
  { position: [-.18, -.34, .32], scale: [.09, .12, .07], rotation: [.1, .7, .2], seed: 8.4 },
  { position: [.06, -.54, .28], scale: [.06, .085, .055], rotation: [.4, -.2, .3], seed: 9.9 },
]

const fidelityProfilesV286: Record<OrbFidelityTier, OrbFidelityProfile> = {
  high: { plateDetail: 5, filamentSegments: 64, filamentRadialSegments: 8, branchSegments: 34, branchRadialSegments: 6, nodeDetail: 2, fieldCount: 260, groundSegments: 36 },
  balanced: { plateDetail: 4, filamentSegments: 48, filamentRadialSegments: 6, branchSegments: 24, branchRadialSegments: 5, nodeDetail: 1, fieldCount: 220, groundSegments: 30 },
  mobile: { plateDetail: 3, filamentSegments: 32, filamentRadialSegments: 5, branchSegments: 18, branchRadialSegments: 4, nodeDetail: 1, fieldCount: 150, groundSegments: 20 },
}

const initialVisualV286 = stateVisualsV286.idle

function seededWave(seed: number, value: number) {
  return Math.sin(value * (3.11 + seed * .17) + seed * 7.13) * .5
    + Math.sin(value * (7.37 + seed * .11) - seed * 2.41) * .25
}

function fidelityTierV286(width: number, heightValue: number): OrbFidelityTier {
  const portrait = heightValue > width
  if (width >= 1360 && !portrait) return 'high'
  if (width >= 720) return 'balanced'
  return 'mobile'
}

function reliquaryPlateGeometryV286(seed: number, detail: number) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const graphite = new THREE.Color('#242724')
  const mineral = new THREE.Color('#4b4b43')
  const bronze = new THREE.Color('#6a5541')
  const ash = new THREE.Color('#81796d')
  const crevice = new THREE.Color('#171a18')

  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), y = position.getY(index), z = position.getZ(index)
    const length = Math.max(.001, Math.hypot(x, y, z))
    const nx = x / length, ny = y / length, nz = z / length
    const longitude = Math.atan2(nz, nx)
    const fracture = seededWave(seed, longitude + ny * 1.8)
    const grain = seededWave(seed + 2.7, nx * 2.2 + ny * 1.3 - nz * .8)
    const strata = seededWave(seed + 5.9, ny * 5.4 + longitude * .62)
    const chipped = Math.abs(Math.sin((nx * 2.8 + ny * 3.9 - nz * 2.1 + seed) * 2.2))
    const pitWave = Math.abs(Math.sin((nx * 8.7 - ny * 6.1 + nz * 7.9 + seed * 1.7)))
    const pit = Math.pow(Math.max(0, pitWave - .72) / .28, 3)
    const radial = .91
      + fracture * .10
      + grain * .052
      + strata * .018
      - Math.pow(chipped, 13) * .052
      - pit * .018
    const lateral = 1 + .06 * Math.sin(ny * 5.4 + seed)
    position.setXYZ(
      index,
      nx * radial * lateral,
      ny * radial * (1 + .04 * grain + .012 * strata),
      nz * radial * (.78 + .07 * fracture - pit * .012),
    )

    const exposed = THREE.MathUtils.smoothstep(nz, -.55, .76)
    const edge = THREE.MathUtils.clamp(Math.abs(fracture) * .82 + chipped * .20 + pit * .35, 0, 1)
    const cavity = THREE.MathUtils.clamp((-nz + .28) * .58 + Math.max(0, -grain) * .18, 0, 1)
    const color = graphite.clone()
      .lerp(mineral, .24 + exposed * .27)
      .lerp(bronze, .04 + Math.max(0, fracture) * .20 + Math.max(0, strata) * .05)
      .lerp(ash, edge * .12)
      .lerp(crevice, cavity * .13 + pit * .15)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function reliquaryFilamentGeometriesV286(profile: OrbFidelityProfile) {
  const targets: V3[] = [
    [-.44, .70, .18], [-.15, .84, .20], [.31, .63, .20], [.42, .30, .28], [.38, -.05, .33],
    [.28, -.45, .29], [-.02, -.67, .25], [-.34, -.46, .30], [-.40, -.10, .34], [-.31, .34, .37],
  ]
  const geometries: THREE.TubeGeometry[] = []
  targets.forEach(([tx, ty, tz], index) => {
    const side = index % 2 ? 1 : -1
    const start = new THREE.Vector3(-.04 + side * .035, -.68 + (index % 3) * .035, .12 + (index % 2) * .03)
    const midA = new THREE.Vector3(side * (.10 + (index % 4) * .025), -.28 + index * .065, .24 + (index % 3) * .035)
    const midB = new THREE.Vector3(tx * .58 + side * .05, ty * .48, .30 + (index % 2) * .045)
    const end = new THREE.Vector3(tx, ty, tz)
    geometries.push(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([start, midA, midB, end], false, 'centripetal', .42),
      profile.filamentSegments,
      .0055 + (index % 3) * .0017,
      profile.filamentRadialSegments,
      false,
    ))
    if (index % 2 === 0) {
      const branchStart = midB.clone()
      const branchEnd = end.clone().add(new THREE.Vector3(side * (.12 + index * .006), .08 - (index % 3) * .03, -.03))
      geometries.push(new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          branchStart,
          branchStart.clone().lerp(branchEnd, .52).add(new THREE.Vector3(-side * .025, .035, .015)),
          branchEnd,
        ], false, 'centripetal', .42),
        profile.branchSegments,
        .0035 + (index % 3) * .0007,
        profile.branchRadialSegments,
        false,
      ))
    }
  })
  return geometries
}

function reliquaryGroundTracesV286(profile: OrbFidelityProfile) {
  return Array.from({ length: 7 }, (_, index) => {
    const angle = -.42 + index * .94
    const reach = .72 + (index % 3) * .19
    const sideBend = (index % 2 ? 1 : -1) * (.08 + (index % 3) * .025)
    const points = [
      new THREE.Vector3(Math.cos(angle) * .20, .018, Math.sin(angle) * .15),
      new THREE.Vector3(Math.cos(angle) * reach * .46 + sideBend, .012, Math.sin(angle) * reach * .32),
      new THREE.Vector3(Math.cos(angle + sideBend) * reach, .005, Math.sin(angle + sideBend) * reach * .55),
    ]
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points, false, 'centripetal', .42),
      profile.groundSegments,
      .010 + (index % 2) * .002,
      profile.filamentRadialSegments,
      false,
    )
  })
}

function memoryFieldV286(count: number) {
  const positions = new Float32Array(count * 3)
  const coreCount = Math.round(count * .70)
  for (let index = 0; index < count; index++) {
    const core = index < coreCount
    const a = Math.sin(index * 12.9898 + 4.17) * 43758.5453
    const b = Math.sin(index * 78.233 + 1.93) * 24634.6345
    const c = Math.sin(index * 43.117 + 8.11) * 18472.2191
    const rx = a - Math.floor(a), ry = b - Math.floor(b), rz = c - Math.floor(c)
    if (core) {
      const lane = (index % 7) - 3
      const y = -.70 + ry * 1.48
      const x = lane * .055 + (rx - .5) * .25 + Math.sin(y * 4.1 + index * .07) * .035
      const z = .17 + rz * .30 + (1 - Math.abs(y)) * .06
      positions.set([x, y, z], index * 3)
    } else {
      const side = index % 2 ? -1 : 1
      const y = -.62 + ry * 1.35
      const x = side * (.38 + rx * .35)
      const z = -.02 + rz * .42
      positions.set([x, y, z], index * 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.computeBoundingSphere()
  return geometry
}

function memoryNodeGeometryV286(seed: number, detail: number) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), y = position.getY(index), z = position.getZ(index)
    const length = Math.max(.001, Math.hypot(x, y, z))
    const nx = x / length, ny = y / length, nz = z / length
    const irregularity = .88 + seededWave(seed, nx * 3.3 + ny * 2.1 - nz * 1.7) * .12
    position.setXYZ(index, nx * irregularity * (1 + ny * .035), ny * irregularity, nz * irregularity * (1 - nx * .04))
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function useOrbStateV286() {
  const [state, setState] = useState<OrbState>('idle')
  useEffect(() => {
    const world = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    const initial = world?.dataset.homeOrbState as OrbState | undefined
    if (initial && Object.hasOwn(stateVisualsV286, initial)) setState(initial)
    const listener = (event: CustomEvent<OrbStateEventDetail>) => setState(event.detail.state)
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [])
  return state
}

export function HomeOrbReliquaryV286() {
  const state = useOrbStateV286()
  const reducedMotion = useReducedMotion()
  const { size } = useThree()
  const portrait = size.height > size.width
  const fidelityTier = fidelityTierV286(size.width, size.height)
  const profile = fidelityProfilesV286[fidelityTier]
  const visual = stateVisualsV286[state]
  const shellRoot = useRef<THREE.Group>(null)
  const innerRoot = useRef<THREE.Group>(null)
  const plateRefs = useRef<Array<THREE.Mesh | null>>([])
  const shellMaterialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const filamentMaterialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const nodeMaterialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const groundMaterialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const fieldMaterial = useRef<THREE.PointsMaterial>(null)
  const primaryLight = useRef<THREE.PointLight>(null)
  const secondaryLight = useRef<THREE.PointLight>(null)
  const groundLight = useRef<THREE.PointLight>(null)
  const y = height(ORB.x, ORB.z)

  const plates = useMemo(
    () => plateSpecsV286.map((spec) => reliquaryPlateGeometryV286(spec.seed, profile.plateDetail)),
    [profile.plateDetail],
  )
  const filaments = useMemo(() => reliquaryFilamentGeometriesV286(profile), [profile])
  const nodes = useMemo(
    () => nodeSpecsV286.map((spec) => memoryNodeGeometryV286(spec.seed, profile.nodeDetail)),
    [profile.nodeDetail],
  )
  const field = useMemo(() => memoryFieldV286(profile.fieldCount), [profile.fieldCount])
  const groundTraces = useMemo(() => reliquaryGroundTracesV286(profile), [profile])
  const targetColors = useMemo(() => ({
    primary: new THREE.Color(visual.primary),
    secondary: new THREE.Color(visual.secondary),
    field: new THREE.Color(visual.field),
    light: new THREE.Color(visual.light),
    shell: new THREE.Color(visual.shellEmissive),
  }), [visual])
  const neutralGroundEmissive = useMemo(() => new THREE.Color('#1a2924'), [])

  useEffect(() => () => {
    plates.forEach((geometry) => geometry.dispose())
    filaments.forEach((geometry) => geometry.dispose())
    nodes.forEach((geometry) => geometry.dispose())
    field.dispose()
    groundTraces.forEach((geometry) => geometry.dispose())
  }, [field, filaments, groundTraces, nodes, plates])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const transitionAlpha = 1 - Math.exp(-delta * (reducedMotion ? 13 : 4.8))

    shellMaterialRefs.current.forEach((material) => {
      if (!material) return
      material.emissive.lerp(targetColors.shell, transitionAlpha)
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, .018 + visual.activity * .025, transitionAlpha)
    })
    filamentMaterialRefs.current.forEach((material, index) => {
      if (!material) return
      const target = index % 5 === 0 ? targetColors.secondary : targetColors.primary
      material.color.lerp(target, transitionAlpha)
      material.emissive.lerp(target, transitionAlpha)
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, .24 + visual.activity * .30 + (index % 4) * .025, transitionAlpha)
      material.opacity = THREE.MathUtils.lerp(material.opacity, .54 + visual.activity * .25, transitionAlpha)
    })
    nodeMaterialRefs.current.forEach((material, index) => {
      if (!material) return
      const target = index % 3 === 0 ? targetColors.secondary : targetColors.primary
      material.color.lerp(target, transitionAlpha)
      material.emissive.lerp(target, transitionAlpha)
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, .34 + visual.activity * .42, transitionAlpha)
    })
    groundMaterialRefs.current.forEach((material, index) => {
      if (!material) return
      material.emissive.lerp(index % 3 === 0 ? targetColors.primary : neutralGroundEmissive, transitionAlpha)
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, .025 + visual.activity * .045, transitionAlpha)
    })

    const fieldBreath = reducedMotion ? 1 : .94 + .06 * Math.sin(t * (.47 + visual.activity * .08))
    if (fieldMaterial.current) {
      fieldMaterial.current.color.lerp(targetColors.field, transitionAlpha)
      fieldMaterial.current.opacity = THREE.MathUtils.lerp(fieldMaterial.current.opacity, visual.fieldOpacity * fieldBreath, transitionAlpha)
      fieldMaterial.current.size = THREE.MathUtils.lerp(fieldMaterial.current.size, .022 + visual.activity * .005, transitionAlpha)
    }
    if (primaryLight.current) {
      primaryLight.current.color.lerp(targetColors.light, transitionAlpha)
      primaryLight.current.intensity = THREE.MathUtils.lerp(primaryLight.current.intensity, .30 + visual.activity * .54, transitionAlpha)
    }
    if (secondaryLight.current) {
      secondaryLight.current.color.lerp(targetColors.secondary, transitionAlpha)
      secondaryLight.current.intensity = THREE.MathUtils.lerp(secondaryLight.current.intensity, .12 + visual.activity * .24, transitionAlpha)
    }
    if (groundLight.current) {
      groundLight.current.color.lerp(targetColors.primary, transitionAlpha)
      groundLight.current.intensity = THREE.MathUtils.lerp(groundLight.current.intensity, .08 + visual.activity * .12, transitionAlpha)
    }

    if (reducedMotion) {
      const settleAlpha = 1 - Math.exp(-delta * 10)
      plateRefs.current.forEach((mesh, index) => {
        if (!mesh) return
        const spec = plateSpecsV286[index]
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, spec.position[1], settleAlpha)
        mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, spec.rotation[0], settleAlpha)
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, spec.rotation[2], settleAlpha)
      })
      if (innerRoot.current) {
        innerRoot.current.rotation.y = THREE.MathUtils.lerp(innerRoot.current.rotation.y, -.08, settleAlpha)
        innerRoot.current.rotation.z = THREE.MathUtils.lerp(innerRoot.current.rotation.z, 0, settleAlpha)
      }
      if (shellRoot.current) shellRoot.current.rotation.y = THREE.MathUtils.lerp(shellRoot.current.rotation.y, -.18, settleAlpha)
      return
    }

    plateRefs.current.forEach((mesh, index) => {
      if (!mesh) return
      const spec = plateSpecsV286[index]
      const phase = index * 1.17
      mesh.position.y = spec.position[1] + Math.sin(t * (.10 + index * .006) + phase) * (.0035 + visual.activity * .0025)
      mesh.rotation.x = spec.rotation[0] + Math.sin(t * (.08 + index * .004) + phase * .7) * .0045
      mesh.rotation.z = spec.rotation[2] + Math.cos(t * (.09 + index * .005) + phase) * .0055
    })
    if (innerRoot.current) {
      innerRoot.current.rotation.y = -.08 + Math.sin(t * .13) * (.008 + visual.activity * .006)
      innerRoot.current.rotation.z = Math.sin(t * .17 + .8) * .005
    }
    if (shellRoot.current) shellRoot.current.rotation.y = -.18 + Math.sin(t * .055) * .004
  })

  return <group
    name="home-v286-biomorphic-memory-reliquary"
    userData={{
      artRevision: 'v286-biomorphic-memory-reliquary',
      polishRevision: 'v289-aaa-reliquary-convergence',
      visualIntent: 'grounded-fractured-mineral-memory-reliquary-with-distributed-internal-light',
      visualOnly: true,
      interactionOwner: false,
      fidelityTier,
      state,
    }}
  >
    <group
      ref={shellRoot}
      position={[ORB.x, y + (portrait ? 1.12 : 1.05), ORB.z]}
      rotation={[.055, -.18, -.055]}
      scale={portrait ? [1.62, 1.68, 1.50] : [1.34, 1.38, 1.24]}
      name={`home-v286-reliquary-state-${state}`}
    >
      {plates.map((geometry, index) => {
        const spec = plateSpecsV286[index]
        return <mesh
          key={`plate-${index}`}
          ref={(node) => { plateRefs.current[index] = node }}
          geometry={geometry}
          position={spec.position}
          rotation={spec.rotation}
          scale={spec.scale}
          raycast={() => null}
          castShadow
          receiveShadow
          name={`home-v286-weathered-shell-plate-${index}`}
          userData={{ visualOnly: true, interactionOwner: false, shellLayer: index }}
        >
          <meshStandardMaterial
            ref={(material) => { shellMaterialRefs.current[index] = material }}
            vertexColors
            color={spec.tint}
            emissive={initialVisualV286.shellEmissive}
            emissiveIntensity={.018 + initialVisualV286.activity * .025}
            roughness={.90 - (index % 3) * .03}
            metalness={index % 4 === 0 ? .028 : .008}
            envMapIntensity={.62}
            dithering
          />
        </mesh>
      })}

      <group ref={innerRoot} name="home-v286-layered-internal-memory-world" userData={{ visualOnly: true, interactionOwner: false }}>
        {filaments.map((geometry, index) => {
          const initialColor = index % 5 === 0 ? initialVisualV286.secondary : initialVisualV286.primary
          return <mesh key={`filament-${index}`} geometry={geometry} raycast={() => null} name={`home-v286-embedded-memory-filament-${index}`}>
            <meshStandardMaterial
              ref={(material) => { filamentMaterialRefs.current[index] = material }}
              color={initialColor}
              emissive={initialColor}
              emissiveIntensity={.24 + initialVisualV286.activity * .30 + (index % 4) * .025}
              transparent
              opacity={.54 + initialVisualV286.activity * .25}
              roughness={.58}
              metalness={0}
              depthWrite={false}
              dithering
            />
          </mesh>
        })}

        {nodeSpecsV286.map((node, index) => {
          const initialColor = index % 3 === 0 ? initialVisualV286.secondary : initialVisualV286.primary
          return <mesh
            key={`memory-node-${index}`}
            geometry={nodes[index]}
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
            raycast={() => null}
            name={`home-v286-recessed-memory-node-${index}`}
          >
            <meshStandardMaterial
              ref={(material) => { nodeMaterialRefs.current[index] = material }}
              color={initialColor}
              emissive={initialColor}
              emissiveIntensity={.34 + initialVisualV286.activity * .42}
              roughness={.60}
              metalness={.01}
              dithering
            />
          </mesh>
        })}

        <points geometry={field} raycast={() => null} name="home-v286-localized-memory-field">
          <pointsMaterial
            ref={fieldMaterial}
            color={initialVisualV286.field}
            size={.022 + initialVisualV286.activity * .005}
            sizeAttenuation
            transparent
            opacity={initialVisualV286.fieldOpacity}
            depthWrite={false}
          />
        </points>

        <pointLight ref={primaryLight} position={[-.10, .20, .36]} color={initialVisualV286.light} intensity={.30 + initialVisualV286.activity * .54} distance={3.0} decay={2} />
        <pointLight ref={secondaryLight} position={[.35, -.28, .20]} color={initialVisualV286.secondary} intensity={.12 + initialVisualV286.activity * .24} distance={2.2} decay={2} />
      </group>
    </group>

    <group position={[ORB.x, y + .018, ORB.z]} rotation={[0, -.12, 0]} name="home-v286-inlaid-ground-memory-traces" userData={{ visualOnly: true, interactionOwner: false }}>
      {groundTraces.map((geometry, index) => <mesh key={`ground-trace-${index}`} geometry={geometry} raycast={() => null}>
        <meshStandardMaterial
          ref={(material) => { groundMaterialRefs.current[index] = material }}
          color={index % 3 === 0 ? '#5e4b3b' : '#343d38'}
          emissive={index % 3 === 0 ? initialVisualV286.primary : '#1a2924'}
          emissiveIntensity={.025 + initialVisualV286.activity * .045}
          roughness={.94}
          metalness={0}
        />
      </mesh>)}
      <pointLight ref={groundLight} position={[0, .12, .12]} color={initialVisualV286.primary} intensity={.08 + initialVisualV286.activity * .12} distance={2.0} decay={2} />
    </group>
  </group>
}
