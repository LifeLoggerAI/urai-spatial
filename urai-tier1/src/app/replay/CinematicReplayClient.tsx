'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { createMineralMaps } from '@/spatial/assets/naturalSurfaceMaps'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemory, SelectedMemoryMedia, SelectedMemoryReplaySegment } from '@/spatial/memory/selectedMemoryContract'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { ReplayProductControls } from './ReplayProductControls'

const REPLAY_ENVIRONMENT_MODEL = '/assets/urai/generated/models/replay-memory-environment-v1.glb'
const REPLAY_ROCK_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const REPLAY_ROCK_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const REPLAY_FERN = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf'
const REPLAY_FIELD_POSITION: [number, number, number] = [0, 0.18, -5.35]

type ReplayTruthLevel = 'recorded' | 'context' | 'inferred' | 'unknown'
type ReplayPhaseId = SelectedMemoryReplaySegment['id']

const PHASE_VISUALS: Record<ReplayPhaseId, { ambient: number; fill: number; source: number; fogNear: number; fogFar: number }> = {
  // V220 keeps the truthful no-recording state spatially readable while making
  // the authored cove own first read instead of caption/control-shell darkness.
  memory: { ambient: 0.84, fill: 1.24, source: 6.8, fogNear: 18, fogFar: 56 },
  emotion: { ambient: 0.76, fill: 1.12, source: 6.1, fogNear: 16, fogFar: 52 },
  pattern: { ambient: 0.8, fill: 1.18, source: 6.4, fogNear: 17, fogFar: 54 },
  return: { ambient: 0.88, fill: 1.3, source: 5.4, fogNear: 20, fogFar: 58 },
}

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

function activeReplaySegment(memory: SelectedMemory, progressMs: number) {
  return memory.replayManifest.segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs)
    ?? memory.replayManifest.segments.at(-1)
}

function truthCue(memory: SelectedMemory, phase: ReplayPhaseId | undefined): { level: ReplayTruthLevel; label: string; detail: string } {
  if (phase === 'memory') {
    if (memory.sourceMedia.length) {
      return { level: 'recorded', label: 'Recorded source', detail: 'Captured media is shown as source evidence.' }
    }
    return { level: 'context', label: 'Memory context', detail: 'No visual recording is available; Replay remains bounded to known memory context.' }
  }
  if (phase === 'emotion') {
    return { level: 'inferred', label: 'URAI interpretation', detail: 'Emotional context is interpretive and is not presented as recorded fact.' }
  }
  if (phase === 'pattern') {
    return { level: 'inferred', label: 'Possible pattern', detail: 'Pattern language is provisional and may be corrected by the memory owner.' }
  }
  return { level: 'context', label: 'Return', detail: 'Interpretation recedes while the selected memory identity remains intact.' }
}

function prepareReplayModel(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const growthMatch = object.name.match(/^replay-memory-growth(?:-(?:trunk|crown))?-(\d+)$/)
    const rejectedPresentation = object.name === 'replay-film-portal'
      || object.name === 'replay-film-veil'
      || object.name === 'replay-camera-track'
      || object.name.startsWith('replay-memory-panel-')
      || Boolean(growthMatch)
    if (rejectedPresentation) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v149-no-flat-film-portal-panel-wall-or-repeated-growth-grid'
    }
    object.castShadow = true
    object.receiveShadow = true
    object.frustumCulled = true
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const materials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.lerp(new THREE.Color('#8a8176'), 0.28)
        material.roughness = Math.max(material.roughness, 0.82)
        material.metalness = Math.min(material.metalness, 0.04)
        material.envMapIntensity = 0.5
      }
      return material
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return clone
}

function ReplayCameraRig({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0.24, -4.15))
  const desired = useRef(new THREE.Vector3())

  useFrame(({ camera, clock }, delta) => {
    const breathe = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.045
    const arc = reducedMotion ? 0 : (progress - 0.5) * 0.34
    desired.current.set(arc, 0.42 + breathe, 6.6 - progress * 0.65)
    camera.position.lerp(desired.current, Math.min(1, delta * (reducedMotion ? 8 : 2.4)))
    camera.lookAt(target.current)
  })

  return null
}

function RecordedMemoryField({ media, playing, progressMs, muteVideo }: { media: SelectedMemoryMedia | undefined; playing: boolean; progressMs: number; muteVideo: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const renderedMediaFrames = useRef(0)
  useEffect(() => { renderedMediaFrames.current = 0 }, [texture])
  useFrame(({ gl }) => {
    const owner = gl.domElement.closest('[data-testid="cinematic-replay-client"]')
    if (gl.info.render.calls === 0) {
      owner?.setAttribute('data-replay-render-ready', 'false')
      return
    }
    renderedMediaFrames.current++
    if (renderedMediaFrames.current >= 2) owner?.setAttribute('data-replay-render-ready', 'true')
  })

  const surfaceGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(15.2, 8.6, 88, 48)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const normalizedX = x / 7.6
      const normalizedY = y / 4.3
      const depth = -0.52 * normalizedX * normalizedX - 0.12 * normalizedY * normalizedY + Math.sin(y * 1.18) * 0.045 + Math.sin(x * 1.43 + y * 0.71) * 0.022
      positions.setZ(index, depth)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  useEffect(() => {
    let disposed = false
    let localTexture: THREE.Texture | null = null
    let localVideo: HTMLVideoElement | null = null

    setTexture(null)
    if (!media || media.kind === 'audio') return () => { disposed = true }

    if (media.kind === 'image') {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(media.url, (loaded) => {
        if (disposed) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.minFilter = THREE.LinearFilter
        localTexture = loaded
        setTexture(loaded)
      })
    }

    if (media.kind === 'video') {
      const video = document.createElement('video')
      video.src = media.url
      video.crossOrigin = 'anonymous'
      video.playsInline = true
      video.muted = muteVideo
      video.loop = false
      video.preload = 'metadata'
      localVideo = video
      videoRef.current = video
      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.colorSpace = THREE.SRGBColorSpace
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      localTexture = videoTexture
      setTexture(videoTexture)
    }

    return () => {
      disposed = true
      localVideo?.pause()
      if (localVideo) localVideo.removeAttribute('src')
      if (videoRef.current === localVideo) videoRef.current = null
      localTexture?.dispose()
    }
  }, [media, muteVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) void video.play().catch(() => undefined)
    else {
      video.pause()
      if (Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, progressMs / 1000)
    }
  }, [playing, progressMs])

  if (!media || media.kind === 'audio') {
    return <group name="replay-v218-no-fabricated-visual-source" visible={false} userData={{ truthRole: 'unknown-kept-unbuilt', visualRepair: 'no-blank-screen-no-fabricated-source' }} />
  }

  return (
    <group name="replay-v218-recorded-memory-field" userData={{ visualRepair: 'embedded-irregular-source-field-not-screen-or-panel', truthRole: 'recorded-source' }}>
      <mesh position={REPLAY_FIELD_POSITION} geometry={surfaceGeometry} rotation={[-0.035, 0, 0]}>
        {texture
          ? <shaderMaterial
              uniforms={{ uMap: { value: texture } }}
              vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
              fragmentShader={`
                uniform sampler2D uMap;
                varying vec2 vUv;
                void main() {
                  vec2 p=(vUv-.5)*2.0;
                  float boundary=pow(abs(p.x),3.2)+pow(abs((p.y+.04)*1.04),3.6);
                  float weather=.055*sin(p.x*7.0+p.y*4.0)+.032*sin(p.x*17.0-p.y*9.0)+.018*sin(p.x*33.0+p.y*21.0);
                  float mask=1.0-smoothstep(.72,1.04,boundary+weather);
                  vec3 mediaColor=texture2D(uMap,vUv).rgb;
                  float innerShade=1.0-.13*smoothstep(.52,.96,boundary);
                  gl_FragColor = vec4(mediaColor*innerShade, mask);
                  #include <colorspace_fragment>
                }
              `}
              transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
            />
          : <meshStandardMaterial color="#111b19" emissive="#1c2c29" emissiveIntensity={0.025} roughness={0.98} metalness={0} side={THREE.DoubleSide} />}
      </mesh>
    </group>
  )
}

function replayBasinHeight(x: number, z: number) {
  const side = Math.pow(Math.max(0, (Math.abs(x) - 4.6) / 9.4), 1.55) * 6.2
  const hollow = -.34 * Math.exp(-(x * x / 18 + (z + 3.8) * (z + 3.8) / 34))
  const weather = .16 * Math.sin(x * .58 + z * .31) + .07 * Math.sin(x * 1.9 - z * .77) + .035 * Math.cos(x * 4.1 + z * 2.4)
  return -2.34 + side + hollow + weather
}

function replayBasinGeometry() {
  const columns = 84
  const rows = 76
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const stone = new THREE.Color('#4c4b46')
  const warm = new THREE.Color('#8a725c')
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const z = 8.2 - v * 28
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = -14 + u * 28
      positions.push(x, replayBasinHeight(x, z), z)
      uvs.push(u*6,v*6)
      const path=1-THREE.MathUtils.smoothstep(Math.abs(x-.16*Math.sin(z*.32)),.7,2.2)
      const color=stone.clone().lerp(warm,.18+.36*path)
      colors.push(color.r,color.g,color.b)
    }
  }
  const stride=columns+1
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c)}
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function replayMemoryWallGeometry() {
  const columns=92
  const rows=24
  const positions:number[]=[]
  const colors:number[]=[]
  const indices:number[]=[]
  const shadow=new THREE.Color('#303532')
  const moss=new THREE.Color('#6e6b61')
  const plum=new THREE.Color('#665d62')
  for(let row=0;row<=rows;row+=1){
    const v=row/rows
    const y=-3.0+v*11.0
    for(let column=0;column<=columns;column+=1){
      const u=column/columns
      const x=-14+u*28
      const recess=2.2*Math.exp(-Math.pow(x/7.1,4))
      const z=-5.1-recess+.32*Math.sin(x*.72+v*6.1)+.15*Math.sin(x*2.4-v*10.2)
      positions.push(x,y+.22*Math.sin(u*15+v*8),z)
      const color=shadow.clone().lerp(moss,.16+.52*v).lerp(plum,.12*(.5+.5*Math.sin(x*.36)))
      colors.push(color.r,color.g,color.b)
    }
  }
  const stride=columns+1
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}


function prepareReplayNaturalAsset(source: THREE.Object3D) {
  const clone = source.clone(true)
  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const normalization = 1 / Math.max(size.x, size.y, size.z, 0.001)
  clone.scale.setScalar(normalization)
  clone.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const materials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = Math.max(material.roughness, 0.86)
        material.metalness = Math.min(material.metalness, 0.02)
        material.envMapIntensity = 0.62
      }
      return material
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return clone
}

function ReplayScannedProp({ src, position, rotation, scale }: {
  src: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const asset = useGLTF(src)
  const model = useMemo(() => prepareReplayNaturalAsset(asset.scene), [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <group position={position} rotation={rotation} scale={scale} raycast={() => null}><primitive object={model} /></group>
}

function ReplayDemoLake() {
  return <mesh name="replay-v227-memory-lake" position={[0, -2.02, -12.4]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} receiveShadow>
    <planeGeometry args={[14.8, 22, 1, 1]} />
    <meshPhysicalMaterial color="#456b70" roughness={0.28} metalness={0.01} clearcoat={0.72} clearcoatRoughness={0.22} envMapIntensity={1.08} transparent opacity={0.86} />
  </mesh>
}

const REPLAY_DEMO_OUTCROPS = [
  // V226: keep generated-demo geology grounded into the basin instead of
  // presenting isolated oversized boulders.  The banks remain authored,
  // non-personal context and deliberately sit at the frame edges.
  { x: -9.4, z: -4.8, lift: .12, scale: [2.00, .72, 1.62] as [number, number, number], rotation: [0.10, 0.42, -0.08] as [number, number, number] },
  { x: 9.1, z: -6.1, lift: .10, scale: [1.84, .68, 1.72] as [number, number, number], rotation: [-0.06, -0.58, 0.04] as [number, number, number] },
  { x: -10.8, z: -11.3, lift: .08, scale: [2.26, .82, 1.92] as [number, number, number], rotation: [0.08, 0.76, -0.05] as [number, number, number] },
  { x: 10.4, z: -13.0, lift: .09, scale: [2.14, .78, 1.84] as [number, number, number], rotation: [-0.04, -0.92, 0.08] as [number, number, number] },
  { x: -8.5, z: -17.7, lift: .06, scale: [1.86, .68, 1.66] as [number, number, number], rotation: [0.02, 1.12, -0.06] as [number, number, number] },
  { x: 8.4, z: -19.4, lift: .06, scale: [1.96, .72, 1.72] as [number, number, number], rotation: [0.06, -1.24, 0.03] as [number, number, number] },
] as const

function ReplayMemoryGeography({ accent, demo }: { accent: string; demo: boolean }) {
  const basin=useMemo(replayBasinGeometry,[])
  const wall=useMemo(replayMemoryWallGeometry,[])
  const maps=useMemo(createMineralMaps,[])
  useEffect(()=>()=>{basin.dispose();wall.dispose();maps.forEach((texture)=>texture.dispose())},[basin,maps,wall])
  return <group name="replay-v216-embedded-memory-cove" userData={{ visualIntent:'media-manifested-inside-continuous-weathered-place' }}>
    <mesh geometry={basin} receiveShadow castShadow>
      {demo
        ? <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.22,.22)} color="#918878" vertexColors roughness={.94} metalness={0} envMapIntensity={.38} />
        : <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.40,.40)} color="#b8aa98" vertexColors roughness={.94}/>}
    </mesh>
    {demo ? null : <mesh geometry={wall} position={[0,0,-.18]} receiveShadow castShadow>\n      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.52,.52)} color="#8b7d70" vertexColors roughness={.98} side={THREE.DoubleSide}/>\n    </mesh>}
    {demo ? <group name="replay-v227-scanned-memory-cove" userData={{ visualRepair: 'scanned-rock-shore-memory-lake-no-game-boulders' }}>
      <ReplayDemoLake />
      {REPLAY_DEMO_OUTCROPS.map((outcrop, index) => <ReplayScannedProp
        key={`rock-${index}`}
        src={index % 2 ? REPLAY_ROCK_01 : REPLAY_ROCK_02}
        position={[outcrop.x, replayBasinHeight(outcrop.x, outcrop.z) + outcrop.lift, outcrop.z]}
        rotation={outcrop.rotation}
        scale={outcrop.scale}
      />)}
      <ReplayScannedProp src={REPLAY_FERN} position={[-5.9, replayBasinHeight(-5.9, -6.8) + .02, -6.8]} rotation={[0, .42, 0]} scale={[1.15, 1.15, 1.15]} />
      <ReplayScannedProp src={REPLAY_FERN} position={[5.6, replayBasinHeight(5.6, -7.4) + .02, -7.4]} rotation={[0, -1.08, 0]} scale={[1.0, 1.0, 1.0]} />
      <ReplayScannedProp src={REPLAY_FERN} position={[-6.7, replayBasinHeight(-6.7, -14.8) + .02, -14.8]} rotation={[0, 1.5, 0]} scale={[.88, .88, .88]} />
      <ReplayScannedProp src={REPLAY_FERN} position={[6.4, replayBasinHeight(6.4, -15.6) + .02, -15.6]} rotation={[0, -.62, 0]} scale={[.92, .92, .92]} />
    </group> : null}
    <pointLight position={[-5.8,.8,-3.8]} color="#dfb382" intensity={demo ? 1.34 : 1.52} distance={15} decay={2}/>
    <pointLight position={[5.2,1.4,-4.2]} color={accent} intensity={demo ? 1.08 : 1.04} distance={14} decay={2}/>
  </group>
}

function replayDemoDistantTerrainGeometry() {
  const columns = 72
  const rows = 42
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const near = new THREE.Color('#303732')
  const mid = new THREE.Color('#47413b')
  const haze = new THREE.Color('#67514b')
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const z = -17.5 - v * 50
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = -34 + u * 68
      const side = Math.pow(Math.abs(x) / 34, 1.55) * (1.0 + v * 3.6)
      const range = Math.pow(v, 1.45) * (2.2 + 1.25 * Math.sin(x * .14 + .6) + .72 * Math.sin(x * .31 - 1.1))
      const erosion = .24 * Math.sin(x * .74 + z * .19) + .11 * Math.sin(x * 1.67 - z * .37)
      const basin = -2.08 + side + range + erosion * (.45 + v * .75)
      positions.push(x, basin, z)
      const color = near.clone().lerp(mid, .24 + v * .42).lerp(haze, Math.max(0, v - .62) * .34)
      colors.push(color.r, color.g, color.b)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column
    const b = a + 1
    const d = a + stride + 1
    const e = a + stride
    indices.push(a, b, e, b, d, e)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function ReplayDemoHorizon() {
  const distantTerrain = useMemo(replayDemoDistantTerrainGeometry, [])
  useEffect(() => () => distantTerrain.dispose(), [distantTerrain])
  return <group name="replay-explicit-demo-cinematic-horizon" userData={{ truthRole: 'generated-demo-visualization', referenceRole: 'explicit-demo-open-memory-horizon', visualRepair: 'v228-physical-depth-terrain-atmosphere' }}>
    <mesh position={[0, 4.2, -56]} raycast={() => null}>
      <planeGeometry args={[112, 40]} />
      <shaderMaterial
        depthWrite={false}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
          float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
          float fbm(vec2 p){ float n=0.,a=.5; for(int i=0;i<5;i++){ n+=noise(p)*a; p=p*2.03+vec2(7.1,3.7); a*=.5; } return n; }
          void main(){
            float y=vUv.y;
            vec3 horizon=vec3(0.54,0.39,0.33);
            vec3 middle=vec3(0.25,0.27,0.33);
            vec3 top=vec3(0.075,0.105,0.16);
            vec3 color=mix(horizon,middle,smoothstep(.12,.52,y));
            color=mix(color,top,smoothstep(.48,1.0,y));
            float haze=(1.0-smoothstep(.16,.40,y))*(.08+.08*fbm(vec2(vUv.x*3.2,1.7)));
            color+=vec3(.72,.55,.43)*haze;
            vec2 sunP=(vUv-vec2(.54,.315))*vec2(2.25,1.0);
            float sun=1.0-smoothstep(.007,.012,length(sunP));
            float glow=1.0-smoothstep(.012,.065,length(sunP));
            color+=vec3(1.0,.72,.42)*glow*.12+vec3(1.0,.86,.66)*sun*.58;
            float cloud=fbm(vec2(vUv.x*6.0+2.1,vUv.y*8.0-1.3));
            float band=smoothstep(.57,.78,cloud)*smoothstep(.28,.43,y)*(1.0-smoothstep(.64,.82,y));
            color=mix(color,color+vec3(.055,.060,.072),band*.30);
            float grain=(hash(floor(vUv*vec2(1200.0,700.0)))-.5)*.010;
            gl_FragColor=vec4(color+grain,1.0);
          }`}
        toneMapped={false}
      />
    </mesh>
    <mesh name="replay-v228-distant-physical-terrain" geometry={distantTerrain} receiveShadow raycast={() => null}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} envMapIntensity={0.16} />
    </mesh>
    <mesh position={[0, 1.8, -63]} raycast={() => null}>
      <planeGeometry args={[96, 18]} />
      <meshBasicMaterial color="#705a55" transparent opacity={0.075} depthWrite={false} fog toneMapped={false} />
    </mesh>
  </group>
}

function ReplayTimelineField({ memory, progress }: { memory: SelectedMemory; progress: number }) {
  return <group name="replay-semantic-timeline" visible={false} userData={{ segmentCount: memory.replayManifest.segments.length, progress, retiredVisualRole: 'v211-no-stick-and-ball-timeline' }}>
    {memory.replayManifest.segments.map((segment) => <group key={segment.id} userData={{ replaySegment: segment.id }} />)}
  </group>
}

function ReplaySpatialScene({ memory, playing, progressMs, muteVideo }: { memory: SelectedMemory; playing: boolean; progressMs: number; muteVideo: boolean }) {
  const gltf = useGLTF(REPLAY_ENVIRONMENT_MODEL)
  const model = useMemo(() => prepareReplayModel(gltf.scene), [gltf.scene])
  const reducedMotion = useReducedMotion()
  const progress = memory.replayManifest.durationMs > 0 ? progressMs / memory.replayManifest.durationMs : 0
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image')
  const phase = activeReplaySegment(memory, progressMs)?.id ?? 'memory'
  const visuals = PHASE_VISUALS[phase]

  return (
    <>
      <color attach="background" args={[memory.demo ? "#171e27" : memory.visuals.sky]} />
      <fog attach="fog" args={[memory.demo ? "#293139" : memory.visuals.sky, memory.demo ? 20 : visuals.fogNear, memory.demo ? 76 : visuals.fogFar]} />
      <ambientLight intensity={memory.demo ? visuals.ambient * 1.18 : visuals.ambient} color={memory.demo ? "#ddd5c3" : "#c4d0c9"} />
      <hemisphereLight intensity={memory.demo ? visuals.fill * 1.16 : visuals.fill} color={memory.visuals.light} groundColor={memory.demo ? "#45483f" : memory.visuals.ground} />
      <directionalLight position={[-8, 11, 6]} intensity={memory.demo ? 4.15 : 4.25} color="#ecd2aa" castShadow />
      <directionalLight position={[6, 5, -7]} intensity={memory.demo ? 1.34 : 1.45} color={memory.visuals.accent} />
      <pointLight position={[0, 1.4, -4.6]} intensity={memory.demo ? visuals.source * 0.34 : visuals.source} distance={22} color={memory.visuals.accent} />
      <pointLight position={[-5.5, 2.8, -1.5]} intensity={memory.demo ? 2.65 : 2.8} distance={24} color="#e0b482" />
      {memory.demo ? <ReplayDemoHorizon /> : <primitive object={model} name="replay-memory-environment-v1" />}
      <ReplayMemoryGeography accent={memory.visuals.accent} demo={memory.demo}/>
      <RecordedMemoryField media={media} playing={playing} progressMs={progressMs} muteVideo={muteVideo} />
      <ReplayTimelineField memory={memory} progress={progress} />
      <ReplayCameraRig progress={progress} reducedMotion={reducedMotion} />
    </>
  )
}

function ReplayNeutralSpatialScene() {
  const gltf = useGLTF(REPLAY_ENVIRONMENT_MODEL)
  const model = useMemo(() => prepareReplayModel(gltf.scene), [gltf.scene])
  return (
    <>
      <color attach="background" args={['#02060d']} />
      <fog attach="fog" args={['#02060d', 8, 30]} />
      <ambientLight intensity={0.24} />
      <hemisphereLight intensity={0.44} color="#bff8ff" groundColor="#07121d" />
      <pointLight position={[0, 1.4, -5]} intensity={2.8} distance={14} color="#70dcec" />
      <primitive object={model} name="replay-memory-horizon-environment" />
      <ReplayCameraRig progress={0} reducedMotion />
    </>
  )
}

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const quality = useAdaptiveSpatialQuality()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const truth = useMemo(() => memory ? truthCue(memory, active?.id) : null, [active?.id, memory])
  const recordedAudioUrl = memory?.replayManifest.audioUrl ?? memory?.sourceMedia.find((item) => item.kind === 'audio')?.url
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const chooseMemory = useCallback(() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/', entryPortal: 'replay-memory-horizon', cameraCheckpoint: 'life-map-overview' }), [])

  useEffect(() => {
    if (!memory || !playing) return
    const tick = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setPlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [duration, memory, playing, reducedMotion])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      const desired = progressMs / 1000
      if (Math.abs(audio.currentTime - desired) > .35) audio.currentTime = desired
      void audio.play().catch(() => undefined)
    } else {
      audio.pause()
      const desired = progressMs / 1000
      if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, desired)
    }
  }, [playing, progressMs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') { event.preventDefault(); unwind(); return }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory) { event.preventDefault(); setPlaying((value) => !value) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, unwind])

  if (!memory) return (
    <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src} data-replay-neutral="memory-horizon" data-replay-spatial-owner="r3f-memory-theater">
      <Canvas className="replaySpatialCanvas" dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}>
        <ReplayNeutralSpatialScene />
      </Canvas>
      <section role={result.status === 'loading' ? 'status' : 'region'} aria-label="Replay memory horizon"><p>{result.status === 'loading' ? 'Opening memory field' : 'Memory horizon'}</p><h1>{result.status === 'loading' ? 'A memory is coming into view.' : 'Choose a memory to enter its reconstruction.'}</h1><span>{result.status === 'loading' ? 'The spatial field will open as soon as the selected memory is ready.' : 'Replay begins from a memory in Life Map, so you always arrive with context.'}</span>{result.status === 'loading' ? null : <button type="button" onClick={chooseMemory}>Choose a memory</button>}</section>
      <style>{stateCss}</style>
    </main>
  )

  const percent = Math.round((progressMs / duration) * 100)
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
    '--replay-sky': memory.visuals.sky,
    '--replay-ground': memory.visuals.ground,
    '--replay-asset': assetCssStack(replayAssets.primary),
    '--replay-progress': `${percent}%`,
  } as CSSProperties

  const setTimeline = (next: number) => {
    setProgressMs(next)
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, next / 1000)
  }

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-canonical-asset={replayAssets.primary.src} data-replay-spatial-owner="r3f-memory-theater" data-replay-environment={REPLAY_ENVIRONMENT_MODEL} data-replay-composition="v225-source-first-memory-environment-readable-phased-return" data-replay-demo-art="v229-readable-cinematic-material-depth" data-replay-camera="anchored-first-person-witness" data-replay-truth={truth?.level ?? 'unknown'}>
    <Canvas className="replaySpatialCanvas" shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = memory.demo ? 1.30 : 1.92 }}>
      <ReplaySpatialScene memory={memory} playing={playing} progressMs={progressMs} muteVideo={Boolean(recordedAudioUrl)} />
    </Canvas>
    <div className="replayAtmosphere" aria-hidden="true" />
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span><button className="unwind" type="button" onClick={unwind}>Focus</button></header>
    <section className="caption" aria-live="polite" data-truth-level={truth?.level ?? 'unknown'}><div className="captionMeta"><small>{active?.label ?? 'Replay'}</small>{truth ? <b>{truth.label}</b> : null}</div><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="memoryPacing" aria-label="Replay pacing" data-memory-motion={playing ? 'unfolding' : 'held'}>
      <button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Hold memory' : 'Begin memory'}>{playing ? 'Hold memory' : progressMs >= duration ? 'Re-enter memory' : 'Begin memory'}</button>
      <div className="memoryProgress" role="progressbar" aria-label={`Memory unfolding, ${percent} percent complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span /></div>
      <span className="memoryPhase">{active?.label ?? 'Memory'}</span>
      <input className="memoryPosition" type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setTimeline(Number(event.currentTarget.value))} aria-label={`Memory position, ${percent} percent complete`} />
    </section>
    <ReplayProductControls memory={memory} />
    <details className="truthGuide"><summary>Truth</summary><div><strong>{truth?.label ?? 'Replay context'}</strong><p>{truth?.detail ?? 'Unknown information remains visually unresolved rather than being fabricated.'}</p><ul><li><b>Recorded</b> uses captured source media.</li><li><b>Context</b> remains less specific than recorded evidence.</li><li><b>Interpretation</b> is provisional and correctable.</li><li><b>Unknown</b> stays unbuilt.</li></ul></div></details>
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    {recordedAudioUrl ? <audio ref={audioRef} src={recordedAudioUrl} preload="metadata" data-replay-recorded-audio="true" /> : null}
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayState:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.28) 48%,rgba(1,5,12,.8) 100%);pointer-events:none}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.7),rgba(2,8,16,.24));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 var(--font-sans);letter-spacing:-.045em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}}@media(prefers-reduced-motion:reduce){.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--replay-sky);isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayAtmosphere{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,transparent 0 38%,rgba(0,0,0,.04) 66%,rgba(0,0,0,.34) 100%);pointer-events:none}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:clamp(104px,15svh,150px);transform:translateX(-50%);width:min(680px,82vw);text-align:center;text-shadow:0 3px 30px #000}.captionMeta{display:flex;justify-content:center;align-items:center;gap:8px}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.captionMeta b{padding:4px 7px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(2,7,12,.5);color:rgba(255,255,255,.78);font-size:9px;letter-spacing:.08em;text-transform:uppercase}.caption[data-truth-level=inferred] .captionMeta b{border-style:dashed}.caption[data-truth-level=context] .captionMeta b{opacity:.78}.caption strong{display:block;margin-top:7px;font:500 clamp(1rem,2.1vw,1.48rem)/1.12 var(--font-sans);letter-spacing:-.025em}.caption span{display:block;margin:6px auto 0;max-width:560px;font-size:11px;color:rgba(255,255,255,.68)}.memoryPacing{position:absolute;z-index:7;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 32px));display:grid;grid-template-columns:auto minmax(110px,1fr) auto;align-items:center;gap:12px;padding:9px 12px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(2,7,14,.36);backdrop-filter:blur(14px)}.memoryPacing button{min-width:118px;min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,22,29,.78);color:#eefcff;font-weight:850}.memoryProgress{height:4px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.memoryProgress>span{display:block;width:var(--replay-progress);height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--replay-light),var(--replay-accent))}.memoryPhase{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.68)}.memoryPosition{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.transcript,.truthGuide{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.truthGuide{top:max(66px,calc(env(safe-area-inset-top) + 60px));max-width:300px}.transcript p,.truthGuide p{margin:8px 0 0;line-height:1.5}.truthGuide ul{margin:9px 0 2px;padding-left:18px;color:rgba(255,255,255,.76);line-height:1.5}.truthGuide li+li{margin-top:4px}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.memoryPacing button:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible,.truthGuide summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.memoryPacing{bottom:max(10px,env(safe-area-inset-bottom));width:calc(100vw - 24px);grid-template-columns:minmax(104px,auto) minmax(56px,1fr) auto;gap:8px;padding:8px 10px}.memoryPacing button{min-width:104px}.caption{bottom:94px;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript,.truthGuide{top:max(76px,calc(env(safe-area-inset-top) + 70px));right:14px;bottom:auto;max-width:180px}.truthGuide{top:max(124px,calc(env(safe-area-inset-top) + 118px))}.unwind{margin-top:9px}.controls{grid-template-columns:auto 1fr auto;padding:9px 10px}.controls button{min-width:64px}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:82px}}@media(prefers-reduced-motion:reduce){.memoryPacing{backdrop-filter:none}}@media(forced-colors:active){.memoryPacing,.unwind,.transcript,.truthGuide{border:2px solid CanvasText}}`

useGLTF.preload(REPLAY_ENVIRONMENT_MODEL)
useGLTF.preload(REPLAY_ROCK_01)
useGLTF.preload(REPLAY_ROCK_02)
useGLTF.preload(REPLAY_FERN)