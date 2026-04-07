#!/usr/bin/env bash
set -Eeuo pipefail

ts="$(date +%Y%m%d_%H%M%S)"

if [ -f "./src/spatial/scene/SpatialScene.tsx" ] && [ -f "./package.json" ] && [ -d "./src" ]; then
  APP="$(pwd)"
elif [ -f "/home/user/urai-spatial/urai-tier1/src/spatial/scene/SpatialScene.tsx" ] && [ -f "/home/user/urai-spatial/urai-tier1/package.json" ]; then
  APP="/home/user/urai-spatial/urai-tier1"
else
  echo "FATAL: run this from /home/user/urai-spatial/urai-tier1"
  exit 1
fi

cd "$APP"

AUDIT_DIR="$APP/_audit/pass6_replay_entry_depth_lock_${ts}"
BACKUP_DIR="$AUDIT_DIR/backup"
mkdir -p "$AUDIT_DIR" "$BACKUP_DIR"

log() { printf '%s\n' "$*" | tee -a "$AUDIT_DIR/run.log" ; }
fail() { log "FATAL: $*"; exit 1; }

need_file() {
  [ -f "$1" ] || fail "missing required file: $1"
}

need_anchor() {
  local file="$1"
  local pattern="$2"
  grep -Eq "$pattern" "$file" || fail "anchor not found in $file :: $pattern"
}

backup_file() {
  local f="$1"
  local rel="${f#"$APP"/}"
  mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
  cp -f "$f" "$BACKUP_DIR/$rel"
  log "BACKUP: $rel"
}

SCENE_FILE="$APP/src/spatial/scene/SpatialScene.tsx"
STARFIELD_FILE="$APP/src/spatial/components/Starfield.tsx"

need_file "$SCENE_FILE"
need_file "$STARFIELD_FILE"

need_anchor "$SCENE_FILE" "type Phase = 'home' \| 'ascent' \| 'lifemap' \| 'focus' \| 'replay'"
need_anchor "$SCENE_FILE" "function CameraDirector\("
need_anchor "$SCENE_FILE" "function FocusStar\("
need_anchor "$SCENE_FILE" "const \\[phase, setPhase\\] = useState<Phase>\\('home'\\)"
need_anchor "$SCENE_FILE" "const onSelectStar = useCallback"
need_anchor "$STARFIELD_FILE" "export default function Starfield\("
need_anchor "$STARFIELD_FILE" "phase = 'lifemap'"
need_anchor "$STARFIELD_FILE" "const farLayerOpacity ="

backup_file "$SCENE_FILE"
backup_file "$STARFIELD_FILE"

{
  echo "=== FACTS ==="
  echo "APP=$APP"
  echo "DATE=$(date -Iseconds)"
  echo "BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  echo "COMMIT=$(git rev-parse HEAD 2>/dev/null || true)"
  echo
  echo "=== BEFORE: REPLAY SURFACE ==="
  grep -nE 'replay|focus|CameraDirector|selectedStar|onBackgroundClick|onSelectStar|Starfield|FocusStar' "$SCENE_FILE" "$STARFIELD_FILE" || true
} | tee "$AUDIT_DIR/before_audit.txt" >/dev/null

cat > "$SCENE_FILE" <<'TS'
'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import HomeEnvironment from '@/spatial/scene/HomeEnvironment'
import Starfield, { createCanonicalStars } from '@/spatial/components/Starfield'

type Phase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

type CanonStar = {
  id: string
  position: [number, number, number]
  intensity?: number
  size?: number
  layer?: 'near' | 'mid' | 'far'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function easeCanon01(t: number) {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function smooth01(t: number) {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpVec3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ]
}

const HOME_CAMERA_POS: [number, number, number] = [0, 1.45, 12]
const HOME_CAMERA_TARGET: [number, number, number] = [0, 1.2, 0]
const ASCENT_MID_POS: [number, number, number] = [0, 3.2, 6.5]
const ASCENT_MID_TARGET: [number, number, number] = [0, 2.0, -3]
const LIFEMAP_CAMERA_POS: [number, number, number] = [0, 0.85, 24]
const LIFEMAP_CAMERA_TARGET: [number, number, number] = [0, 0.15, -34]

function CameraDirector({
  phase,
  ascentStartAt,
  selectedStar,
  onAscentComplete,
}: {
  phase: Phase
  ascentStartAt: number | null
  selectedStar: CanonStar | null
  onAscentComplete: () => void
}) {
  const { camera } = useThree()
  const lookTarget = useRef(new THREE.Vector3(...HOME_CAMERA_TARGET))
  const completeSent = useRef(false)

  useEffect(() => {
    ;(camera as THREE.PerspectiveCamera).fov = phase === 'lifemap' || phase === 'focus' || phase === 'replay' ? 42 : 50
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    if (phase !== 'ascent') completeSent.current = false
  }, [camera, phase])

  useFrame((state, delta) => {
    const dt = clamp(delta * 60, 0.25, 2)

    if (phase === 'ascent' && ascentStartAt != null) {
      const elapsed = state.clock.elapsedTime - ascentStartAt
      const raw = clamp(elapsed / 2.15, 0, 1)
      const settle = smooth01(raw)

      const firstLeg = raw < 0.52
      const localT = firstLeg ? raw / 0.52 : (raw - 0.52) / 0.48

      const fromPos = firstLeg ? HOME_CAMERA_POS : ASCENT_MID_POS
      const toPos = firstLeg ? ASCENT_MID_POS : LIFEMAP_CAMERA_POS
      const fromTarget = firstLeg ? HOME_CAMERA_TARGET : ASCENT_MID_TARGET
      const toTarget = firstLeg ? ASCENT_MID_TARGET : LIFEMAP_CAMERA_TARGET

      const pos = lerpVec3(fromPos, toPos, easeCanon01(localT))
      const target = lerpVec3(fromTarget, toTarget, smooth01(localT))

      const arcLift = Math.sin(raw * Math.PI) * 0.85
      const forwardBias = Math.sin(raw * Math.PI * 0.75) * 1.15

      camera.position.x += (pos[0] - camera.position.x) * 0.18 * dt
      camera.position.y += ((pos[1] + arcLift) - camera.position.y) * 0.18 * dt
      camera.position.z += ((pos[2] - forwardBias) - camera.position.z) * 0.18 * dt

      lookTarget.current.x += (target[0] - lookTarget.current.x) * 0.16 * dt
      lookTarget.current.y += (target[1] - lookTarget.current.y) * 0.16 * dt
      lookTarget.current.z += (target[2] - lookTarget.current.z) * 0.16 * dt
      camera.lookAt(lookTarget.current)

      ;(camera as THREE.PerspectiveCamera).fov = lerp(50, 42, settle)
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()

      if (raw >= 1 && !completeSent.current) {
        completeSent.current = true
        onAscentComplete()
      }
      return
    }

    if ((phase === 'focus' || phase === 'replay') && selectedStar) {
      const sx = selectedStar.position[0]
      const sy = selectedStar.position[1]
      const sz = selectedStar.position[2]

      const targetPos: [number, number, number] =
        phase === 'replay'
          ? [sx * 0.10, sy * 0.10 + 0.04, sz + 6.0]
          : [sx * 0.18, sy * 0.18 + 0.12, sz + 9.5]

      const targetLook: [number, number, number] =
        phase === 'replay'
          ? [sx, sy, sz - 1.8]
          : [sx, sy, sz]

      const fov = phase === 'replay' ? 36 : 40

      camera.position.x += (targetPos[0] - camera.position.x) * 0.08 * dt
      camera.position.y += (targetPos[1] - camera.position.y) * 0.08 * dt
      camera.position.z += (targetPos[2] - camera.position.z) * 0.08 * dt

      lookTarget.current.x += (targetLook[0] - lookTarget.current.x) * 0.09 * dt
      lookTarget.current.y += (targetLook[1] - lookTarget.current.y) * 0.09 * dt
      lookTarget.current.z += (targetLook[2] - lookTarget.current.z) * 0.09 * dt

      camera.lookAt(lookTarget.current)
      ;(camera as THREE.PerspectiveCamera).fov += (fov - (camera as THREE.PerspectiveCamera).fov) * 0.08 * dt
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
      return
    }

    const targetPos =
      phase === 'lifemap' || phase === 'focus' || phase === 'replay'
        ? LIFEMAP_CAMERA_POS
        : HOME_CAMERA_POS

    const targetLook =
      phase === 'lifemap' || phase === 'focus' || phase === 'replay'
        ? LIFEMAP_CAMERA_TARGET
        : HOME_CAMERA_TARGET

    camera.position.x += (targetPos[0] - camera.position.x) * 0.10 * dt
    camera.position.y += (targetPos[1] - camera.position.y) * 0.10 * dt
    camera.position.z += (targetPos[2] - camera.position.z) * 0.10 * dt

    lookTarget.current.x += (targetLook[0] - lookTarget.current.x) * 0.10 * dt
    lookTarget.current.y += (targetLook[1] - lookTarget.current.y) * 0.10 * dt
    lookTarget.current.z += (targetLook[2] - lookTarget.current.z) * 0.10 * dt

    camera.lookAt(lookTarget.current)
  })

  return null
}

function FadeGate({
  phase,
  ascentStartAt,
}: {
  phase: Phase
  ascentStartAt: number | null
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    let o = 0
    if (phase === 'home') o = 1
    if (phase === 'ascent' && ascentStartAt != null) {
      const t = clamp((state.clock.elapsedTime - ascentStartAt) / 2.15, 0, 1)
      o = 1 - smooth01(clamp((t - 0.18) / 0.52, 0, 1))
    }
    groupRef.current.visible = o > 0.001
    groupRef.current.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material
      if (!mat) return
      const applyOpacity = (m: THREE.Material & { transparent?: boolean; opacity?: number }) => {
        m.transparent = true
        m.opacity = o
      }
      if (Array.isArray(mat)) mat.forEach((m) => applyOpacity(m as THREE.Material & { transparent?: boolean; opacity?: number }))
      else applyOpacity(mat as THREE.Material & { transparent?: boolean; opacity?: number })
    })
  })

  return (
    <group ref={groupRef} name="home-fade-gate">
      <HomeEnvironment />
    </group>
  )
}

function OrbAnchor({
  phase,
  ascentStartAt,
  onActivate,
}: {
  phase: Phase
  ascentStartAt: number | null
  onActivate: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return

    const idle = state.clock.elapsedTime
    let opacity = phase === 'home' ? 1 : 0

    if (phase === 'ascent' && ascentStartAt != null) {
      const t = clamp((state.clock.elapsedTime - ascentStartAt) / 2.15, 0, 1)
      opacity = 1 - smooth01(clamp((t - 0.08) / 0.46, 0, 1))
      meshRef.current.position.y = lerp(1.02, 0.55, t)
      meshRef.current.position.z = lerp(0.18, -4.5, t)
      meshRef.current.scale.setScalar(lerp(1, 0.58, t))
    } else {
      meshRef.current.position.set(0, 1.02 + Math.sin(idle * 0.62) * 0.02, 0.18)
      meshRef.current.scale.setScalar(1 + Math.sin(idle * 0.78) * 0.010)
    }

    meshRef.current.visible = opacity > 0.001
    matRef.current.opacity = opacity
  })

  return (
    <mesh ref={meshRef} onClick={onActivate}>
      <sphereGeometry args={[0.72, 36, 36]} />
      <meshBasicMaterial ref={matRef} transparent opacity={1} color="#d9ecff" />
    </mesh>
  )
}

function FocusStar({
  star,
  active,
  replay,
}: {
  star: CanonStar | null
  active: boolean
  replay: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || !star) return
    const targetScale = replay ? 0.18 : active ? 0.22 : 0.001
    const cur = meshRef.current.scale.x
    const next = cur + (targetScale - cur) * 0.12
    meshRef.current.scale.setScalar(next)
    meshRef.current.position.set(star.position[0], star.position[1], star.position[2])
    meshRef.current.visible = next > 0.002
    meshRef.current.rotation.z = state.clock.elapsedTime * (replay ? 0.010 : 0.018)
    matRef.current.opacity = replay ? 0.42 : active ? 0.82 : 0
  })

  if (!star) return null

  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial ref={matRef} transparent opacity={0.82} color="#ffffff" />
    </mesh>
  )
}

function ReplayDepthGate({
  phase,
}: {
  phase: Phase
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state, delta) => {
    if (!meshRef.current || !matRef.current) return
    const dt = clamp(delta * 60, 0.25, 2)
    const targetOpacity = phase === 'replay' ? 0.18 : 0
    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.06 * dt
    meshRef.current.visible = matRef.current.opacity > 0.002
    meshRef.current.rotation.z += 0.0008 * dt
    const breath = Math.sin(state.clock.elapsedTime * 0.22) * 0.08
    meshRef.current.scale.set(44 + breath, 44 + breath, 1)
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -6]} visible={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} color="#0b0f18" depthWrite={false} />
    </mesh>
  )
}

export default function SpatialScene() {
  const stars = useMemo(() => createCanonicalStars() as unknown as CanonStar[], [])
  const [phase, setPhase] = useState<Phase>('home')
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null)
  const [ascentStartAt, setAscentStartAt] = useState<number | null>(null)

  const selectedStar = useMemo(
    () => stars.find((s) => s.id === selectedStarId) ?? null,
    [stars, selectedStarId]
  )

  const startAscent = useCallback(() => {
    if (phase !== 'home') return
    setSelectedStarId(null)
    setAscentStartAt(performance.now() / 1000)
    setPhase('ascent')
  }, [phase])

  const onAscentComplete = useCallback(() => {
    setPhase('lifemap')
    setAscentStartAt(null)
  }, [])

  const onBackgroundClick = useCallback(() => {
    if (phase === 'lifemap') {
      setPhase('home')
      setSelectedStarId(null)
      return
    }
    if (phase === 'focus') {
      setPhase('lifemap')
      return
    }
    if (phase === 'replay') {
      setPhase('focus')
    }
  }, [phase])

  const onSelectStar = useCallback((id: string) => {
    if (phase !== 'lifemap') return
    setSelectedStarId(id)
    setPhase('focus')
  }, [phase])

  const onActivateSelected = useCallback(() => {
    if (phase === 'focus' && selectedStarId) {
      setPhase('replay')
      return
    }
    if (phase === 'replay') {
      setPhase('focus')
    }
  }, [phase, selectedStarId])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#05070b' }}>
      <Canvas
        camera={{ position: HOME_CAMERA_POS, fov: 50, near: 0.1, far: 2000 }}
        onPointerMissed={onBackgroundClick}
      >
        <CameraDirector
          phase={phase}
          ascentStartAt={ascentStartAt}
          selectedStar={selectedStar}
          onAscentComplete={onAscentComplete}
        />

        <FadeGate phase={phase} ascentStartAt={ascentStartAt} />

        <OrbAnchor
          phase={phase}
          ascentStartAt={ascentStartAt}
          onActivate={startAscent}
        />

        <Starfield
          stars={stars as unknown as any}
          visible={phase !== 'home'}
          phase={phase === 'ascent' ? 'lifemap' : phase}
          selectedStarId={phase === 'focus' || phase === 'replay' ? selectedStarId : null}
          opacity={
            phase === 'ascent'
              ? clamp((performance.now() / 1000 - (ascentStartAt ?? performance.now() / 1000)) / 1.25, 0, 1)
              : 1
          }
        />

        <ReplayDepthGate phase={phase} />

        <group onClick={onActivateSelected}>
          <FocusStar
            star={selectedStar}
            active={phase === 'focus' || phase === 'replay'}
            replay={phase === 'replay'}
          />
        </group>

        {phase === 'lifemap' &&
          stars
            .filter((s) => s.layer === 'mid')
            .map((star) => (
              <mesh
                key={`hit-${star.id}`}
                position={star.position}
                onClick={() => onSelectStar(star.id)}
                visible={false}
              >
                <sphereGeometry args={[0.7, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            ))}
      </Canvas>
    </div>
  )
}
TS

cat > "$STARFIELD_FILE" <<'TS'
'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { StarNode, Vec3 } from '@/lib/uraiCanon/state'

type Layer = 'near' | 'mid' | 'far'

type VisualStar = {
  id: string
  position: Vec3
  intensity: number
  size: number
  layer: Layer
}

type StarfieldProps = {
  stars?: StarNode[]
  visible?: boolean
  phase?: string
  selectedStarId?: string | null
  opacity?: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function fract(n: number) {
  return n - Math.floor(n)
}

function seeded(seed: number) {
  return fract(Math.sin(seed * 12.9898) * 43758.5453123)
}

function spread(seed: number, min: number, max: number) {
  return min + (max - min) * seeded(seed)
}

function signedSpread(seed: number, radius: number) {
  return (seeded(seed) * 2 - 1) * radius
}

function sizeFromZ(z: number, layer: Layer) {
  if (layer === 'far') return clamp(0.045 + ((z + 140) / 70) * 0.05, 0.035, 0.09)
  if (layer === 'mid') return clamp(0.10 + ((z + 60) / 40) * 0.13, 0.10, 0.23)
  return clamp(0.18 + ((z + 18) / 10) * 0.12, 0.18, 0.30)
}

function intensityFromZ(z: number, layer: Layer) {
  if (layer === 'far') return clamp(0.14 + ((z + 140) / 70) * 0.14, 0.12, 0.28)
  if (layer === 'mid') return clamp(0.46 + ((z + 60) / 40) * 0.24, 0.44, 0.72)
  return clamp(0.68 + ((z + 18) / 10) * 0.18, 0.66, 0.86)
}

function normalizeInputStar(input: unknown, index: number): VisualStar {
  const fallback = createCanonicalStars(11 + index)[0] as unknown as VisualStar

  if (!input || typeof input !== 'object') return fallback

  const v = input as Record<string, unknown>
  const id = typeof v.id === 'string' ? v.id : `star-${index}`

  const p = Array.isArray(v.position) ? v.position : fallback.position
  const position: Vec3 = [
    typeof p[0] === 'number' ? p[0] : fallback.position[0],
    typeof p[1] === 'number' ? p[1] : fallback.position[1],
    typeof p[2] === 'number' ? p[2] : fallback.position[2],
  ]

  const inferredLayer: Layer =
    position[2] > -18 ? 'near' : position[2] > -65 ? 'mid' : 'far'

  const layer =
    v.layer === 'near' || v.layer === 'mid' || v.layer === 'far'
      ? v.layer
      : inferredLayer

  const size =
    typeof v.size === 'number'
      ? clamp(v.size, 0.035, 0.30)
      : sizeFromZ(position[2], layer)

  const intensity =
    typeof v.intensity === 'number'
      ? clamp(v.intensity, 0.12, 0.86)
      : intensityFromZ(position[2], layer)

  return { id, position, intensity, size, layer }
}

export function createCanonicalStars(seedBase = 11): StarNode[] {
  const out: VisualStar[] = []

  for (let i = 0; i < 260; i += 1) {
    const s = seedBase + i * 17.17
    const z = spread(s + 3, -140, -80)
    out.push({
      id: `far-${i}`,
      layer: 'far',
      position: [
        signedSpread(s + 1, 54),
        signedSpread(s + 2, 30),
        z,
      ],
      intensity: intensityFromZ(z, 'far'),
      size: sizeFromZ(z, 'far'),
    })
  }

  for (let m = 0; m < 44; m += 1) {
    const s = seedBase + 1000 + m * 23.23
    const z = spread(s + 3, -60, -22)
    out.push({
      id: `mid-${m}`,
      layer: 'mid',
      position: [
        signedSpread(s + 1, 20),
        signedSpread(s + 2, 12),
        z,
      ],
      intensity: intensityFromZ(z, 'mid'),
      size: sizeFromZ(z, 'mid'),
    })
  }

  for (let n = 0; n < 10; n += 1) {
    const s = seedBase + 2000 + n * 31.31
    const z = spread(s + 3, -18, -9)
    out.push({
      id: `near-${n}`,
      layer: 'near',
      position: [
        signedSpread(s + 1, 10),
        signedSpread(s + 2, 6.5),
        z,
      ],
      intensity: intensityFromZ(z, 'near'),
      size: sizeFromZ(z, 'near'),
    })
  }

  return out as unknown as StarNode[]
}

export default function Starfield({
  stars,
  visible = true,
  phase = 'lifemap',
  selectedStarId = null,
  opacity = 1,
}: StarfieldProps) {
  const rootRef = useRef<Group>(null)
  const farRef = useRef<Group>(null)
  const midRef = useRef<Group>(null)
  const nearRef = useRef<Group>(null)

  const visualStars = useMemo<VisualStar[]>(() => {
    const source = Array.isArray(stars) && stars.length > 0 ? stars : createCanonicalStars()
    return source.map((s, i) => normalizeInputStar(s, i))
  }, [stars])

  const farStars = useMemo(() => visualStars.filter((s) => s.layer === 'far'), [visualStars])
  const midStars = useMemo(() => visualStars.filter((s) => s.layer === 'mid'), [visualStars])
  const nearStars = useMemo(() => visualStars.filter((s) => s.layer === 'near'), [visualStars])

  const farPositions = useMemo(() => {
    const arr = new Float32Array(farStars.length * 3)
    farStars.forEach((s, idx) => {
      arr[idx * 3 + 0] = s.position[0]
      arr[idx * 3 + 1] = s.position[1]
      arr[idx * 3 + 2] = s.position[2]
    })
    return arr
  }, [farStars])

  const idleT = useRef(0)
  const lagX = useRef(0)
  const lagY = useRef(0)

  useFrame((state, delta) => {
    if (!visible) return

    const dt = clamp(delta * 60, 0.35, 2.0)
    idleT.current += delta

    const px = clamp(state.pointer.x, -1, 1)
    const py = clamp(state.pointer.y, -1, 1)

    lagX.current += (px - lagX.current) * 0.06 * dt
    lagY.current += (py - lagY.current) * 0.06 * dt

    const breathX = Math.sin(idleT.current * 0.23) * 0.025
    const breathY = Math.cos(idleT.current * 0.19) * 0.018
    const breathRot = Math.sin(idleT.current * 0.16) * 0.0035

    const focusQuiet = phase === 'focus' ? 0.72 : 1
    const replayQuiet = phase === 'replay' ? 0.40 : 1
    const quiet = focusQuiet * replayQuiet

    if (rootRef.current) {
      const targetX = lagX.current * 0.08 * quiet + breathX
      const targetY = lagY.current * 0.05 * quiet + breathY
      rootRef.current.position.x += (targetX - rootRef.current.position.x) * 0.022 * dt
      rootRef.current.position.y += (targetY - rootRef.current.position.y) * 0.022 * dt
      rootRef.current.rotation.z += (breathRot - rootRef.current.rotation.z) * 0.016 * dt
    }

    if (farRef.current) {
      const targetX = lagX.current * 0.12 * quiet + breathX * 0.4
      const targetY = lagY.current * 0.06 * quiet + breathY * 0.4
      const targetRotY = lagX.current * 0.006 * quiet
      const targetRotX = -lagY.current * 0.003 * quiet

      farRef.current.position.x += (targetX - farRef.current.position.x) * 0.012 * dt
      farRef.current.position.y += (targetY - farRef.current.position.y) * 0.012 * dt
      farRef.current.rotation.y += (targetRotY - farRef.current.rotation.y) * 0.012 * dt
      farRef.current.rotation.x += (targetRotX - farRef.current.rotation.x) * 0.010 * dt
    }

    if (midRef.current) {
      const targetX = lagX.current * 0.32 * quiet + breathX * 0.7
      const targetY = lagY.current * 0.16 * quiet + breathY * 0.7
      const targetRotY = lagX.current * 0.013 * quiet
      const targetRotX = -lagY.current * 0.007 * quiet

      midRef.current.position.x += (targetX - midRef.current.position.x) * 0.020 * dt
      midRef.current.position.y += (targetY - midRef.current.position.y) * 0.020 * dt
      midRef.current.rotation.y += (targetRotY - midRef.current.rotation.y) * 0.018 * dt
      midRef.current.rotation.x += (targetRotX - midRef.current.rotation.x) * 0.015 * dt
    }

    if (nearRef.current) {
      const targetX = lagX.current * 0.62 * quiet + breathX
      const targetY = lagY.current * 0.28 * quiet + breathY
      const targetRotY = lagX.current * 0.022 * quiet
      const targetRotX = -lagY.current * 0.010 * quiet

      nearRef.current.position.x += (targetX - nearRef.current.position.x) * 0.030 * dt
      nearRef.current.position.y += (targetY - nearRef.current.position.y) * 0.030 * dt
      nearRef.current.rotation.y += (targetRotY - nearRef.current.rotation.y) * 0.026 * dt
      nearRef.current.rotation.x += (targetRotX - nearRef.current.rotation.x) * 0.020 * dt
    }
  })

  if (!visible || phase === 'home') return null

  const midLayerOpacity = phase === 'focus' ? 0.26 : phase === 'replay' ? 0.10 : 1
  const nearLayerOpacity = phase === 'focus' ? 0.12 : phase === 'replay' ? 0.02 : 1
  const farLayerOpacity = phase === 'focus' ? 0.58 : phase === 'replay' ? 0.22 : 1

  return (
    <group ref={rootRef} name="urai-volumetric-starfield">
      <group ref={farRef} name="urai-volumetric-starfield-far">
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[farPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.055}
            sizeAttenuation
            transparent
            opacity={0.28 * opacity * farLayerOpacity}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      </group>

      <group ref={midRef} name="urai-volumetric-starfield-mid">
        {midStars.map((star) => {
          const selected = selectedStarId != null && selectedStarId === star.id
          const scale = selected ? clamp(star.size * 1.10, 0.14, 0.20) : star.size
          const starOpacity =
            (selected ? (phase === 'replay' ? 0.18 : 0.98) : clamp(star.intensity * 0.95, 0.42, 0.70) * midLayerOpacity) * opacity

          return (
            <mesh
              key={star.id}
              position={star.position}
              scale={[scale, scale, scale]}
              frustumCulled={false}
            >
              <sphereGeometry args={[1, 14, 14]} />
              <meshBasicMaterial
                transparent
                opacity={starOpacity}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>

      <group ref={nearRef} name="urai-volumetric-starfield-near">
        {nearStars.map((star) => {
          const selected = selectedStarId != null && selectedStarId === star.id
          const scale = selected ? clamp(star.size * 1.04, 0.16, 0.22) : star.size
          const starOpacity =
            (selected ? (phase === 'replay' ? 0.04 : 0.22) : clamp(star.intensity * 0.82, 0.52, 0.72) * nearLayerOpacity) * opacity

          return (
            <mesh
              key={star.id}
              position={star.position}
              scale={[scale, scale, scale]}
              frustumCulled={false}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                transparent
                opacity={starOpacity}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
TS

{
  echo
  echo "=== AFTER: REPLAY SURFACE ==="
  grep -nE 'ReplayDepthGate|replay|onActivateSelected|targetPos|targetLook|midLayerOpacity|nearLayerOpacity|farLayerOpacity|replay \\? 0.18|replay \\? 0.04' "$SCENE_FILE" "$STARFIELD_FILE" || true
} | tee "$AUDIT_DIR/after_audit.txt" >/dev/null

log "=== TYPECHECK ==="
pnpm exec tsc --noEmit 2>&1 | tee "$AUDIT_DIR/tsc.log" || fail "typecheck failed"

log "=== BUILD ==="
pnpm build 2>&1 | tee "$AUDIT_DIR/build.log" || fail "build failed"

{
  echo
  echo "=== DONE ==="
  echo "Audit:  $AUDIT_DIR"
  echo "Backup: $BACKUP_DIR"
  echo "Scene:   src/spatial/scene/SpatialScene.tsx"
  echo "Stars:   src/spatial/components/Starfield.tsx"
  echo
  echo "PASS 6 enforced:"
  echo "- replay advances deeper than focus"
  echo "- replay narrows look target forward into depth"
  echo "- focus star reduces during replay instead of staying UI-bright"
  echo "- starfield quiets further in replay"
  echo "- replay gets a soft depth veil so it reads as entered space"
} | tee -a "$AUDIT_DIR/run.log"
