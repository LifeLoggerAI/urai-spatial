'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

type MemoryKind = 'home' | 'family' | 'music' | 'tree'

type MemoryGardenSpec = {
  id: string
  kind: MemoryKind
  position: [number, number, number]
  color: string
  scale: number
}

type HomeSanctuaryWorldProps = {
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  playerPosition: MutableRefObject<THREE.Vector3>
  onMemoryOpen: (memoryId: string) => void
}

const MEMORY_GARDENS: readonly MemoryGardenSpec[] = [
  { id: 'place-loved', kind: 'home', position: [-4.45, 0, 1.55], color: '#e6c58f', scale: 1.02 },
  { id: 'voices-dinner', kind: 'family', position: [4.55, 0, -.75], color: '#b8a8dc', scale: .98 },
  { id: 'song-returned', kind: 'music', position: [-4.05, 0, -4.65], color: '#dba4bd', scale: .94 },
  { id: 'quiet-growth', kind: 'tree', position: [3.95, 0, -5.35], color: '#8fc79b', scale: 1.04 },
]

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.733 + salt * 17.117) * 43758.5453
  return value - Math.floor(value)
}

function approachPoint(spec: MemoryGardenSpec) {
  const side = Math.sign(spec.position[0]) || 1
  return new THREE.Vector3(spec.position[0] - side * 1.45, 0, spec.position[2] + .34)
}

function leafShape(scale = 1) {
  const shape = new THREE.Shape()
  shape.moveTo(0, -.82 * scale)
  shape.bezierCurveTo(.62 * scale, -.48 * scale, .58 * scale, .32 * scale, 0, .9 * scale)
  shape.bezierCurveTo(-.58 * scale, .32 * scale, -.62 * scale, -.48 * scale, 0, -.82 * scale)
  return shape
}

function Leaf({ position, rotation, scale, color = '#345f4f', emissive = '#5a9c7d' }: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color?: string
  emissive?: string
}) {
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(leafShape(1), {
    depth: .07,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: .04,
    bevelThickness: .04,
    curveSegments: 18,
  }), [])

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
      <meshPhysicalMaterial color={color} emissive={emissive} emissiveIntensity={.045} roughness={.78} clearcoat={.12} />
    </mesh>
  )
}

function LivingSky({ reducedMotion }: { reducedMotion: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    if (!material.current || reducedMotion) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh name="home-moonlit-living-sky" scale={[46, 28, 46]}>
      <sphereGeometry args={[1, 72, 40]} />
      <shaderMaterial
        ref={material}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vPosition;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          void main() {
            float horizon = smoothstep(0.02, 0.92, vUv.y);
            vec3 low = vec3(0.025, 0.055, 0.070);
            vec3 mid = vec3(0.055, 0.105, 0.115);
            vec3 high = vec3(0.050, 0.040, 0.100);
            vec3 color = mix(low, mid, smoothstep(0.0, 0.50, horizon));
            color = mix(color, high, smoothstep(0.54, 1.0, horizon));

            float veilA = sin(vUv.x * 12.0 + vUv.y * 7.0 + uTime * 0.018) * 0.5 + 0.5;
            float veilB = sin(vUv.x * 7.0 - vUv.y * 11.0 - uTime * 0.014) * 0.5 + 0.5;
            float veil = smoothstep(0.79, 1.0, veilA * veilB) * smoothstep(0.18, 0.84, vUv.y);
            color += vec3(0.035, 0.13, 0.105) * veil * 0.34;
            color += vec3(0.10, 0.055, 0.12) * veil * 0.16;

            vec2 starCell = floor(vUv * vec2(520.0, 260.0));
            float star = step(0.9977, hash(starCell));
            color += vec3(0.76, 0.90, 0.94) * star * smoothstep(0.38, 0.9, vUv.y) * 0.58;

            float moon = smoothstep(0.045, 0.0, distance(vUv, vec2(0.68, 0.73)));
            color += vec3(0.78, 0.84, 0.80) * moon * 0.34;
            color += vec3(0.16, 0.14, 0.22) * pow(max(vPosition.y, 0.0), 4.0);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

function MoonlitTerrain() {
  const geometry = useMemo(() => {
    const surface = new THREE.PlaneGeometry(22, 24, 72, 72)
    const position = surface.attributes.position
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const y = position.getY(index)
      const edge = Math.max(0, Math.abs(x) - 5.4) * .055
      const wave = Math.sin(x * .48 + y * .09) * .055 + Math.sin(y * .34 - x * .12) * .035
      const sanctuaryDip = Math.exp(-((x * x) / 18 + ((y - .8) * (y - .8)) / 42)) * -.08
      position.setZ(index, wave + edge + sanctuaryDip)
    }
    surface.computeVertexNormals()
    return surface
  }, [])

  return (
    <mesh name="home-grounded-horizon" geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.2, -1.25]} receiveShadow>
      <meshStandardMaterial color="#20332e" roughness={.9} metalness={.04} />
    </mesh>
  )
}

function SanctuaryPath() {
  const outer = useMemo(() => {
    const shape = new THREE.Shape()
    const left: [number, number][] = [[-1.55, 8.9], [-1.35, 6.1], [-1.18, 3.7], [-1.08, 1.4], [-.98, -.65], [-.88, -3.25], [-.78, -7.9]]
    const right: [number, number][] = [[1.55, 8.9], [1.35, 6.1], [1.18, 3.7], [1.08, 1.4], [.98, -.65], [.88, -3.25], [.78, -7.9]]
    shape.moveTo(left[0][0], left[0][1])
    left.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
    right.slice().reverse().forEach(([x, y]) => shape.lineTo(x, y))
    shape.closePath()
    return shape
  }, [])
  const inner = useMemo(() => {
    const shape = new THREE.Shape()
    const left: [number, number][] = [[-.52, 8.9], [-.48, 5.9], [-.42, 3.2], [-.38, .5], [-.34, -2.6], [-.28, -7.9]]
    const right: [number, number][] = [[.52, 8.9], [.48, 5.9], [.42, 3.2], [.38, .5], [.34, -2.6], [.28, -7.9]]
    shape.moveTo(left[0][0], left[0][1])
    left.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
    right.slice().reverse().forEach(([x, y]) => shape.lineTo(x, y))
    shape.closePath()
    return shape
  }, [])

  return (
    <group name="home-calm-orb-approach-path">
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.105, 0]} receiveShadow>
        <shapeGeometry args={[outer]} />
        <meshPhysicalMaterial color="#263b36" roughness={.48} metalness={.08} clearcoat={.34} clearcoatRoughness={.66} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.095, 0]}>
        <shapeGeometry args={[inner]} />
        <meshBasicMaterial color="#9cbcae" transparent opacity={.055} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function GroundMist({ reducedMotion, position, scale, opacity }: {
  reducedMotion: boolean
  position: [number, number, number]
  scale: [number, number, number]
  opacity: number
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: opacity } }), [opacity])
  useFrame(({ clock }) => {
    if (!material.current || reducedMotion) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;
          void main(){
            vec2 centered=vUv-.5;
            float edge=smoothstep(.52,.12,length(centered));
            float drift=.72+.28*sin((vUv.x*7.0)+(vUv.y*5.0)+uTime*.05);
            gl_FragColor=vec4(.34,.52,.47,edge*drift*uOpacity);
          }
        `}
      />
    </mesh>
  )
}

function OrganicBough({ side, z }: { side: -1 | 1; z: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 7.7, .15, z + 4.2),
      new THREE.Vector3(side * 7.05, 1.35, z + 2.6),
      new THREE.Vector3(side * 6.1, 2.65, z + 1.2),
      new THREE.Vector3(side * 5.55, 3.7, z - .15),
      new THREE.Vector3(side * 5.2, 4.35, z - 1.7),
    ], false, 'catmullrom', .52)
    return new THREE.TubeGeometry(curve, 72, .18, 12, false)
  }, [side, z])

  return (
    <group name={`home-${side < 0 ? 'west' : 'east'}-living-canopy`}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#243c33" roughness={.86} metalness={.03} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <Leaf
          key={index}
          position={[side * (6.55 - index * .36), 1.35 + index * .72, z + 2.0 - index * .76]}
          rotation={[.12, side * .32, side * (-.42 + index * .18)]}
          scale={[.48 + index * .06, .76 + index * .05, .34]}
          color={index % 2 ? '#2f5a48' : '#345f4f'}
          emissive={index % 2 ? '#7eae82' : '#68a58b'}
        />
      ))}
    </group>
  )
}

function OrbSanctum() {
  const basinPoints = useMemo(() => [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(.72, .02),
    new THREE.Vector2(1.28, .10),
    new THREE.Vector2(1.76, .24),
    new THREE.Vector2(2.08, .38),
    new THREE.Vector2(2.18, .48),
  ], [])

  return (
    <group name="home-orb-sanctum-primary-focal-anchor" position={[0, -.08, -.65]} userData={{ visualPriority: 'primary', worldRole: 'emotional-core' }}>
      <mesh receiveShadow castShadow>
        <latheGeometry args={[basinPoints, 96]} />
        <meshPhysicalMaterial color="#263b35" roughness={.5} metalness={.06} clearcoat={.28} clearcoatRoughness={.58} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .49, 0]}>
        <circleGeometry args={[1.84, 96]} />
        <meshPhysicalMaterial color="#172a27" emissive="#8ac4ad" emissiveIntensity={.045} roughness={.4} metalness={.02} clearcoat={.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .505, 0]}>
        <circleGeometry args={[1.16, 96]} />
        <meshBasicMaterial color="#d4b57c" transparent opacity={.095} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .512, 0]}>
        <circleGeometry args={[.72, 96]} />
        <meshBasicMaterial color="#09100f" transparent opacity={.28} depthWrite={false} />
      </mesh>
      {[-1.9, -1.05, 1.05, 1.9].map((x, index) => (
        <Leaf key={x} position={[x, .53, .36 + Math.abs(x) * .14]} rotation={[-Math.PI / 2, 0, x < 0 ? -.58 : .58]} scale={[.32 + index * .02, .58, .18]} emissive="#b1b77d" />
      ))}
      <pointLight position={[0, 1.45, .35]} color="#f2d29a" intensity={2.05} distance={10} decay={2} castShadow />
      <pointLight position={[0, .7, -1.15]} color="#89c9b3" intensity={.8} distance={7} decay={2} />
      <spotLight position={[0, 7, 3]} color="#f5dfb4" intensity={2.2} distance={16} angle={.34} penumbra={.92} castShadow />
    </group>
  )
}

function DestinationAlcove({ side, destination }: { side: -1 | 1; destination: 'ground' | 'life-map' }) {
  const accent = destination === 'ground' ? '#7eb99a' : '#979bc9'
  const position: [number, number, number] = [side * 4.55, 0, -6.7]
  const arch = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.5, .04, 0),
      new THREE.Vector3(-1.3, 1.55, -.05),
      new THREE.Vector3(-.72, 2.72, -.12),
      new THREE.Vector3(0, 3.08, -.16),
      new THREE.Vector3(.72, 2.72, -.12),
      new THREE.Vector3(1.3, 1.55, -.05),
      new THREE.Vector3(1.5, .04, 0),
    ], false, 'catmullrom', .46)
    return new THREE.TubeGeometry(curve, 72, .15, 12, false)
  }, [])

  return (
    <group name={`home-destination-alcove-${destination}`} position={position} rotation={[0, side * -.22, 0]} userData={{ visualPriority: 'supporting', destination }}>
      <mesh geometry={arch} castShadow receiveShadow>
        <meshStandardMaterial color="#2b3b35" emissive={accent} emissiveIntensity={.035} roughness={.84} metalness={.04} />
      </mesh>
      <mesh position={[0, 1.3, -.36]} scale={[1.48, 1.65, .42]} receiveShadow>
        <dodecahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#172722" emissive={accent} emissiveIntensity={.018} roughness={.94} metalness={.01} />
      </mesh>
      <mesh position={[0, .08, .35]} scale={[1.65, .34, 1.05]} receiveShadow castShadow>
        <dodecahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#263c33" roughness={.88} metalness={.02} />
      </mesh>
      <Leaf position={[side * -.75, .6, .55]} rotation={[.12, side * .28, side * -.52]} scale={[.48, .82, .32]} emissive={accent} />
      <Leaf position={[side * .7, .8, .42]} rotation={[-.08, side * -.24, side * .46]} scale={[.42, .7, .3]} emissive={accent} />
      <pointLight position={[0, 1.25, .42]} color={accent} intensity={.34} distance={4.8} decay={2} />
    </group>
  )
}

function EmbodiedSelfSilhouette() {
  const body = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-.2, 0)
    shape.bezierCurveTo(-.38, .55, -.52, 1.08, -.42, 1.5)
    shape.bezierCurveTo(-.34, 1.82, -.2, 2.08, 0, 2.18)
    shape.bezierCurveTo(.2, 2.08, .34, 1.82, .42, 1.5)
    shape.bezierCurveTo(.52, 1.08, .38, .55, .2, 0)
    shape.closePath()
    return shape
  }, [])

  return (
    <group name="home-embodied-self-silhouette" position={[-1.72, .02, 1.05]} rotation={[0, .16, 0]} userData={{ presentation: 'deliberately-authored-silhouette' }}>
      <mesh castShadow>
        <extrudeGeometry args={[body, { depth: .18, bevelEnabled: true, bevelSegments: 3, bevelSize: .05, bevelThickness: .05, curveSegments: 24 }]} />
        <meshStandardMaterial color="#17231f" emissive="#668a7c" emissiveIntensity={.04} roughness={.92} metalness={.01} />
      </mesh>
      <mesh position={[0, 2.46, .09]} castShadow>
        <dodecahedronGeometry args={[.28, 2]} />
        <meshStandardMaterial color="#1c2824" emissive="#71958a" emissiveIntensity={.035} roughness={.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, .05]}>
        <circleGeometry args={[.58, 48]} />
        <meshBasicMaterial color="#050807" transparent opacity={.32} depthWrite={false} />
      </mesh>
      <pointLight position={[.35, 1.6, -.65]} color="#7fa79b" intensity={.22} distance={3.2} decay={2} />
    </group>
  )
}

function MemorySculpture({ kind, color }: { kind: MemoryKind; color: string }) {
  const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.1} roughness={.72} metalness={.02} />
  if (kind === 'home') return (
    <group position={[0, .54, .05]}>
      <mesh scale={[.82, .5, .62]} castShadow><dodecahedronGeometry args={[.62, 1]} />{material}</mesh>
      <mesh position={[0, .48, -.04]} rotation={[0, .12, 0]} castShadow><coneGeometry args={[.62, .42, 5]} />{material}</mesh>
      <mesh position={[0, -.02, .45]} scale={[.16, .36, .05]}><boxGeometry /><meshStandardMaterial color="#203028" roughness={.9} /></mesh>
    </group>
  )
  if (kind === 'family') return (
    <group position={[0, .42, 0]}>
      {[-.38, 0, .38].map((x, index) => (
        <group key={x} position={[x, index === 1 ? .12 : 0, index === 1 ? -.08 : .04]}>
          <mesh position={[0, .48, 0]}><dodecahedronGeometry args={[.12, 1]} />{material}</mesh>
          <mesh scale={[.18, .46, .16]}><dodecahedronGeometry args={[.5, 1]} />{material}</mesh>
        </group>
      ))}
    </group>
  )
  if (kind === 'music') return (
    <group position={[0, .45, 0]}>
      <mesh position={[-.28, .02, 0]}><dodecahedronGeometry args={[.2, 2]} />{material}</mesh>
      <mesh position={[.22, .16, 0]}><dodecahedronGeometry args={[.16, 2]} />{material}</mesh>
      <mesh position={[.04, .52, 0]} scale={[.07, .62, .07]}><boxGeometry />{material}</mesh>
      <mesh position={[.28, .83, 0]} scale={[.52, .07, .07]}><boxGeometry />{material}</mesh>
    </group>
  )
  return (
    <group position={[0, .25, 0]}>
      <mesh scale={[.14, .95, .14]}><dodecahedronGeometry args={[.62, 1]} /><meshStandardMaterial color="#5e4b38" roughness={.94} /></mesh>
      <Leaf position={[-.22, .78, 0]} rotation={[.12, .12, -.52]} scale={[.34, .58, .24]} color="#3e694f" emissive={color} />
      <Leaf position={[.26, .92, -.04]} rotation={[-.08, -.16, .48]} scale={[.38, .64, .24]} color="#426f55" emissive={color} />
      <Leaf position={[0, 1.24, -.06]} rotation={[Math.PI / 2, 0, 0]} scale={[.42, .58, .22]} color="#4a7559" emissive={color} />
    </group>
  )
}

function MemoryGarden({ spec, reducedMotion, walkTarget, playerPosition, onMemoryOpen }: {
  spec: MemoryGardenSpec
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  playerPosition: MutableRefObject<THREE.Vector3>
  onMemoryOpen: (memoryId: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const nearRef = useRef(false)
  const color = useMemo(() => new THREE.Color(spec.color), [spec.color])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const dx = playerPosition.current.x - spec.position[0]
    const dz = playerPosition.current.z - spec.position[2]
    const near = Math.hypot(dx, dz) < 1.9
    nearRef.current = near
    const breath = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * .28 + spec.position[0]) * .006
    const targetScale = spec.scale * breath * (near ? 1.025 : 1)
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, targetScale, 5.5, delta))
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearRef.current) onMemoryOpen(spec.id)
    else walkTarget.current = approachPoint(spec)
  }

  return (
    <group ref={group} position={spec.position} name={`home-personal-memory-garden-${spec.id}`} userData={{ memoryId: spec.id, visualLanguage: 'living-place-not-icon-bubble' }}>
      <mesh position={[0, .02, 0]} scale={[1.4, .28, 1.08]} receiveShadow castShadow onClick={activate}>
        <dodecahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#263b32" emissive={color} emissiveIntensity={.018} roughness={.9} metalness={.01} />
      </mesh>
      <MemorySculpture kind={spec.kind} color={spec.color} />
      <Leaf position={[-.72, .32, .25]} rotation={[.08, .18, -.62]} scale={[.34, .62, .22]} emissive={spec.color} />
      <Leaf position={[.68, .28, .18]} rotation={[-.06, -.22, .54]} scale={[.32, .58, .22]} emissive={spec.color} />
      <mesh position={[0, .82, .45]} onClick={activate}>
        <boxGeometry args={[2.4, 1.9, 1.2]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 1.0, .5]} color={color} intensity={.36} distance={4.3} decay={2} />
    </group>
  )
}

function SanctuaryAtmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const data = new Float32Array(150 * 3)
    for (let index = 0; index < 150; index += 1) {
      data[index * 3] = (seeded(index, 1) - .5) * 17
      data[index * 3 + 1] = .3 + seeded(index, 2) * 4.8
      data[index * 3 + 2] = -9.8 + seeded(index, 3) * 18.2
    }
    return data
  }, [])

  useFrame((_, delta) => {
    if (points.current && !reducedMotion) points.current.rotation.y += delta * .0022
  })

  return (
    <group name="home-restrained-living-atmosphere">
      <GroundMist reducedMotion={reducedMotion} position={[0, .06, -.7]} scale={[14, 6.4, 1]} opacity={.12} />
      <GroundMist reducedMotion={reducedMotion} position={[0, .12, -6.2]} scale={[17, 5.6, 1]} opacity={.08} />
      <points ref={points}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial color="#d8eee5" size={.022} sizeAttenuation transparent opacity={.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}

export default function HomeSanctuaryWorld({ reducedMotion, walkTarget, playerPosition, onMemoryOpen }: HomeSanctuaryWorldProps) {
  return (
    <group
      name="home-visible-navigable-sanctuary-world"
      data-testid="urai-home-visible-world"
      userData={{
        worldIdentity: 'personal-sanctuary',
        visualLanguage: 'moonlit-obsidian-jade-sanctuary',
        orbHierarchy: 'primary',
        destinationHierarchy: 'supporting',
        directVisualReviewRequired: true,
      }}
    >
      <LivingSky reducedMotion={reducedMotion} />
      <MoonlitTerrain />
      <SanctuaryPath />
      <OrganicBough side={-1} z={-.3} />
      <OrganicBough side={1} z={-1.8} />
      <OrbSanctum />
      <DestinationAlcove side={-1} destination="ground" />
      <DestinationAlcove side={1} destination="life-map" />
      <EmbodiedSelfSilhouette />
      <SanctuaryAtmosphere reducedMotion={reducedMotion} />
      {MEMORY_GARDENS.map((spec) => (
        <MemoryGarden
          key={spec.id}
          spec={spec}
          reducedMotion={reducedMotion}
          walkTarget={walkTarget}
          playerPosition={playerPosition}
          onMemoryOpen={onMemoryOpen}
        />
      ))}
    </group>
  )
}
