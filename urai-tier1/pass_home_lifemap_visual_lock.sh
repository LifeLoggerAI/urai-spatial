#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/home/user/urai-spatial/urai-tier1"
cd "$APP_ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
PASS_NAME="PASS_HOME_LIFEMAP_VISUAL_LOCK"
AUDIT_DIR="_audit/${TS}_${PASS_NAME}"
LOG_FILE="${AUDIT_DIR}/run.log"

mkdir -p "$AUDIT_DIR"
exec > >(tee "$LOG_FILE") 2>&1

TARGETS=(
  "src/spatial/components/HomeEnvironment.tsx"
  "src/spatial/components/LifeMapStarfield.tsx"
  "src/spatial/scene/SpatialScene.tsx"
)

backup_file() {
  local f="$1"
  [ -f "$f" ] || { echo "FAIL: missing target $f"; exit 1; }
  mkdir -p "${AUDIT_DIR}/$(dirname "$f")"
  cp -p "$f" "${AUDIT_DIR}/$f"
}

for f in "${TARGETS[@]}"; do
  backup_file "$f"
done

echo "=== REWRITE HomeEnvironment.tsx ==="
cat > src/spatial/components/HomeEnvironment.tsx <<'INNER_EOF'
'use client'

import React from 'react'

type Props = {
  visible?: boolean
  onSkyOpen?: () => void
}

export default function HomeEnvironment({ visible = true, onSkyOpen }: Props) {
  if (!visible) return null

  return (
    <group>
      <mesh position={[0, 8, -26]}>
        <sphereGeometry args={[42, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshBasicMaterial color="#07142d" side={1} fog={false} />
      </mesh>

      <mesh position={[0, 5.8, -22]}>
        <planeGeometry args={[96, 42]} />
        <meshBasicMaterial
          color="#0a1a38"
          transparent
          opacity={0.42}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <mesh
        position={[0, 7.4, -18]}
        onClick={(e) => {
          e.stopPropagation()
          onSkyOpen?.()
        }}
      >
        <planeGeometry args={[86, 30]} />
        <meshBasicMaterial
          transparent
          opacity={0.001}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2.18, 0, 0]} position={[0, -2.35, -11.5]}>
        <circleGeometry args={[24, 64]} />
        <meshBasicMaterial color="#0a0c10" />
      </mesh>

      <mesh rotation={[-Math.PI / 2.08, 0, 0]} position={[0, -2.18, -8.2]}>
        <circleGeometry args={[17.5, 64]} />
        <meshBasicMaterial color="#10151c" />
      </mesh>

      <mesh rotation={[-Math.PI / 2.02, 0, 0]} position={[0, -2.05, -5.2]}>
        <circleGeometry args={[12, 64]} />
        <meshBasicMaterial color="#171d25" />
      </mesh>

      <mesh position={[0, -1.42, -3.9]}>
        <sphereGeometry args={[0.72, 36, 36]} />
        <meshBasicMaterial color="#f2f4f7" />
      </mesh>

      <mesh position={[0, -1.42, -4.05]}>
        <sphereGeometry args={[1.35, 28, 28]} />
        <meshBasicMaterial color="#d7dde7" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.42, -4.25]}>
        <sphereGeometry args={[2.1, 24, 24]} />
        <meshBasicMaterial color="#9db4d6" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  )
}
INNER_EOF

echo "=== REWRITE LifeMapStarfield.tsx ==="
cat > src/spatial/components/LifeMapStarfield.tsx <<'INNER_EOF'
'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type StarNode = {
  id: string
  position: [number, number, number]
  size: number
  alpha: number
  tone: string
}

type Props = {
  visible?: boolean
  dimmed?: boolean
  onSelectStar?: (id: string) => void
}

function rand(seed: number) {
  const x = Math.sin(seed * 999.913) * 43758.5453
  return x - Math.floor(x)
}

function toneFor(layer: 'near' | 'mid' | 'far', r: number): string {
  if (layer === 'near') {
    if (r > 0.82) return '#fff7dd'
    if (r > 0.48) return '#f3f7ff'
    return '#d9e6ff'
  }

  if (layer === 'mid') {
    if (r > 0.72) return '#edf4ff'
    if (r > 0.42) return '#d9e6ff'
    return '#b8c8df'
  }

  if (r > 0.75) return '#b8c8df'
  if (r > 0.45) return '#9aa9c4'
  return '#7f8da6'
}

function buildStars(count: number, layer: 'near' | 'mid' | 'far'): StarNode[] {
  const stars: StarNode[] = []

  for (let i = 0; i < count; i++) {
    const s = i + 1
    const r1 = rand(s + (layer === 'near' ? 11 : layer === 'mid' ? 111 : 211))
    const r2 = rand(s + (layer === 'near' ? 23 : layer === 'mid' ? 123 : 223))
    const r3 = rand(s + (layer === 'near' ? 37 : layer === 'mid' ? 137 : 237))
    const r4 = rand(s + (layer === 'near' ? 41 : layer === 'mid' ? 141 : 241))
    const r5 = rand(s + (layer === 'near' ? 53 : layer === 'mid' ? 153 : 253))

    const spreadX = layer === 'near' ? 26 : layer === 'mid' ? 42 : 64
    const spreadY = layer === 'near' ? 14 : layer === 'mid' ? 22 : 34

    const z =
      layer === 'near'
        ? -8 - r3 * 10
        : layer === 'mid'
          ? -20 - r3 * 22
          : -52 - r3 * 40

    const size =
      layer === 'near'
        ? 0.05 + r4 * 0.11
        : layer === 'mid'
          ? 0.018 + r4 * 0.05
          : 0.006 + r4 * 0.018

    const alpha =
      layer === 'near'
        ? 0.72 + r2 * 0.2
        : layer === 'mid'
          ? 0.26 + r2 * 0.25
          : 0.07 + r2 * 0.12

    let x = (r1 - 0.5) * spreadX
    let y = (r2 - 0.5) * spreadY

    if (Math.abs(x) < 4.5) {
      x += x < 0 ? -4.5 - r5 * 3 : 4.5 + r5 * 3
    }

    if (Math.abs(y) < 1.4) {
      y += y < 0 ? -1.1 - r5 * 1.4 : 1.1 + r5 * 1.4
    }

    stars.push({
      id: `${layer}-${i}`,
      position: [x, y, z],
      size,
      alpha,
      tone: toneFor(layer, r5),
    })
  }

  return stars
}

function DustField({
  count,
  zMin,
  zMax,
}: {
  count: number
  zMin: number
  zMax: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const r1 = rand(i + 701)
      const r2 = rand(i + 1701)
      const r3 = rand(i + 2701)
      positions[i * 3 + 0] = (r1 - 0.5) * 78
      positions[i * 3 + 1] = (r2 - 0.5) * 42
      positions[i * 3 + 2] = zMin + r3 * (zMax - zMin)
    }

    return positions
  }, [count, zMin, zMax])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.01) * 0.018
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={data.length / 3}
          array={data}
          itemSize={3}
          args={[data, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0.12}
        color="#8fa5c8"
        depthWrite={false}
      />
    </points>
  )
}

function StarLayer({
  stars,
  dimmed,
  drift,
  onSelectStar,
}: {
  stars: StarNode[]
  dimmed?: boolean
  drift: number
  onSelectStar?: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.x = Math.sin(state.clock.elapsedTime * drift) * 0.12
    groupRef.current.position.y =
      Math.cos(state.clock.elapsedTime * drift * 0.6) * 0.05
  })

  return (
    <group ref={groupRef}>
      {stars.map((star) => (
        <mesh
          key={star.id}
          position={star.position}
          onClick={(e) => {
            e.stopPropagation()
            onSelectStar?.(star.id)
          }}
        >
          <sphereGeometry args={[star.size, 18, 18]} />
          <meshBasicMaterial
            color={star.tone}
            transparent
            opacity={dimmed ? star.alpha * 0.22 : star.alpha}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function LifeMapStarfield({
  visible = true,
  dimmed = false,
  onSelectStar,
}: Props) {
  const farStars = useMemo(() => buildStars(220, 'far'), [])
  const midStars = useMemo(() => buildStars(90, 'mid'), [])
  const nearStars = useMemo(() => buildStars(16, 'near'), [])

  if (!visible) return null

  return (
    <group>
      <StarLayer
        stars={farStars}
        dimmed={dimmed}
        drift={0.006}
        onSelectStar={onSelectStar}
      />
      <StarLayer
        stars={midStars}
        dimmed={dimmed}
        drift={0.012}
        onSelectStar={onSelectStar}
      />
      <StarLayer
        stars={nearStars}
        dimmed={dimmed}
        drift={0.02}
        onSelectStar={onSelectStar}
      />
      <DustField count={260} zMin={-86} zMax={-10} />
    </group>
  )
}
INNER_EOF

echo "=== REWRITE SpatialScene.tsx ==="
cat > src/spatial/scene/SpatialScene.tsx <<'INNER_EOF'
'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import useSceneAuthority from '@/spatial/hooks/useSceneAuthority'
import useCameraCanon from '@/spatial/hooks/useCameraCanon'
import { useCanonEsc } from '@/spatial/hooks/useCanonEsc'
import { useInteractionLock } from '@/spatial/hooks/useInteractionLock'
import { useModeIsolation } from '@/spatial/hooks/useModeIsolation'
import { useFocusMode } from '@/spatial/hooks/useFocusMode'
import { useReplayMode } from '@/spatial/hooks/useReplayMode'
import { useBackchainLaw } from '@/spatial/hooks/useBackchainLaw'
import { useTransitionSync } from '@/spatial/hooks/useTransitionSync'
import { useStarRecords } from '@/lib/uraiCanon/useStarRecords'
import CinematicCameraRig from '@/spatial/components/CinematicCameraRig'
import HomeEnvironment from '@/spatial/components/HomeEnvironment'
import LifeMapStarfield from '@/spatial/components/LifeMapStarfield'
import FocusSubject from '@/spatial/components/FocusSubject'
import ReplayChamber from '@/spatial/components/ReplayChamber'
import SceneVeil from '@/spatial/components/SceneVeil'
import RuntimeHud from '@/spatial/components/RuntimeHud'

type CanonMode = 'home' | 'lifemap' | 'focus' | 'replay'
type CameraMode = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

function toCanonMode(mode: string): CanonMode {
  if (mode === 'home') return 'home'
  if (mode === 'focus') return 'focus'
  if (mode === 'replay') return 'replay'
  return 'lifemap'
}

function toCameraMode(mode: string): CameraMode {
  if (mode === 'home') return 'home'
  if (mode === 'ascent') return 'ascent'
  if (mode === 'focus') return 'focus'
  if (mode === 'replay') return 'replay'
  return 'lifemap'
}

export default function SpatialScene() {
  const { stars, loading, error } = useStarRecords()
  const { authority, authorityActions } = useSceneAuthority()

  const renderMode = toCanonMode(authority.mode)
  const cameraMode = toCameraMode(authority.mode)

  const selectedRecord =
    stars.find((star: any) => star.id === authority.selectedStar?.id) ?? null

  const normalizedStar = authority.selectedStar
    ? {
        id: authority.selectedStar.id,
        label: authority.selectedStar.label,
        position: Array.isArray(selectedRecord?.position)
          ? (selectedRecord.position as [number, number, number])
          : ([0, 0, 0] as [number, number, number]),
        tone:
          typeof selectedRecord?.tone === 'string' ? selectedRecord.tone : 'neutral',
        intensity:
          typeof selectedRecord?.intensity === 'number'
            ? selectedRecord.intensity
            : 0.5,
        stability:
          typeof selectedRecord?.stability === 'number'
            ? selectedRecord.stability
            : 0.5,
      }
    : null

  const camera = useCameraCanon({
    mode: cameraMode,
    selectedStar: normalizedStar,
  })

  const transitionFromMode = toCanonMode(camera.fromMode)
  const transitionToMode = toCanonMode(camera.toMode)

  const isolation = useModeIsolation(renderMode)

  const focus = useFocusMode({
    mode: renderMode,
    stars,
    selectedStar: normalizedStar,
    hoveredStar: null,
  })

  const replay = useReplayMode({
    mode: renderMode,
    selectedStar: normalizedStar,
  })

  const backchain = useBackchainLaw(renderMode)

  const transition = useTransitionSync({
    fromMode: transitionFromMode,
    toMode: transitionToMode,
    progress: camera.progress,
    isTransitioning: camera.isTransitioning,
  })

  const interaction = useInteractionLock({
    mode: renderMode,
    orbPanelOpen: authority.orbPanelOpen,
    groundViewOpen: authority.groundViewOpen,
  })

  useCanonEsc(() => {
    if (transition.interactionSuppressed) return
    if (interaction.assertIntent('esc')) authorityActions.esc()
  })

  const subtitle =
    authority.mode === 'home'
      ? 'Home'
      : authority.mode === 'ascent'
        ? 'Ascent'
        : authority.mode === 'lifemap'
          ? 'LifeMap'
          : authority.mode === 'focus'
            ? `Focus: ${authority.selectedStar?.label ?? 'No star selected'}`
            : `Replay: ${authority.selectedStar?.label ?? 'No star selected'}`

  const background =
    authority.mode === 'home'
      ? '#02060b'
      : authority.mode === 'ascent'
        ? '#041022'
        : authority.mode === 'lifemap'
          ? '#01030a'
          : authority.mode === 'focus'
            ? '#050814'
            : '#0b040d'

  const showHomeLayer = authority.mode === 'home'
  const showLifeMapLayer =
    authority.mode === 'lifemap' ||
    authority.mode === 'ascent' ||
    authority.mode === 'focus' ||
    authority.mode === 'replay'
  const showFocusLayer = authority.mode === 'focus' || authority.mode === 'replay'
  const showReplayLayer = authority.mode === 'replay'
  const showStarfield = showLifeMapLayer

  return (
    <div
      data-scene-mode={authority.mode}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background,
      }}
    >
      <Canvas
        camera={{ position: [0, 1.6, 9.5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={[background]} />
        <fog
          attach="fog"
          args={[
            authority.mode === 'home'
              ? '#060b14'
              : authority.mode === 'ascent'
                ? '#081328'
                : authority.mode === 'focus'
                  ? '#050814'
                  : authority.mode === 'replay'
                    ? '#0b040d'
                    : '#01030a',
            authority.mode === 'home' ? 10 : 14,
            authority.mode === 'home' ? 38 : 96,
          ]}
        />

        <CinematicCameraRig
          from={camera.fromMode}
          to={camera.toMode}
          progress={camera.progress}
        />

        <Stars
          radius={180}
          depth={120}
          count={!showHomeLayer && showStarfield ? 1400 : 0}
          factor={2.3}
          saturation={0}
          fade
          speed={0}
        />

        {showHomeLayer ? (
          <HomeEnvironment
            visible={showHomeLayer}
            onSkyOpen={() => {
              if (transition.interactionSuppressed) return
              if (!interaction.assertIntent('open_lifemap_from_sky')) return
              authorityActions.openLifeMap()
            }}
          />
        ) : null}

        {showLifeMapLayer ? (
          <LifeMapStarfield
            visible={showLifeMapLayer}
            dimmed={authority.mode === 'focus' || authority.mode === 'replay'}
            onSelectStar={(id) => {
              if (transition.interactionSuppressed) return
              if (authority.mode !== 'lifemap') return
              if (!interaction.assertIntent('open_focus_from_star')) return
              authorityActions.openFocus(id)
            }}
          />
        ) : null}

        <FocusSubject
          visible={showFocusLayer && !!authority.selectedStar}
          starId={authority.selectedStar?.id ?? null}
        />

        <ReplayChamber
          visible={showReplayLayer && replay.chamberVisible}
          star={normalizedStar}
        />
      </Canvas>

      <SceneVeil
        visible={transition.showOverlayVeil || authority.mode === 'ascent'}
        opacity={authority.mode === 'ascent' ? 0.36 : transition.veilOpacity}
      />

      {process.env.NODE_ENV !== 'production' ? (
        <RuntimeHud
          mode={renderMode}
          subtitle={
            loading
              ? `${subtitle} — loading`
              : error
                ? `${subtitle} — ${error}`
                : `${subtitle} — ${
                    backchain.escTargetMode ? `ESC→${backchain.escTargetMode}` : ''
                  }`
          }
          starCount={stars.length}
          selectedStarLabel={authority.selectedStar?.label ?? null}
          canOpenLifeMap={showHomeLayer && isolation.allowSkyInteraction}
          canOpenFocus={authority.mode === 'lifemap' && !!stars[0]}
          canOpenReplay={
            authority.mode === 'focus' &&
            !!authority.selectedStar &&
            focus.canEnterReplay
          }
          interactionSuppressed={transition.interactionSuppressed}
          onHome={() => authorityActions.goHome()}
          onEsc={() => authorityActions.esc()}
          onOpenLifeMap={() => {
            if (transition.interactionSuppressed) return
            if (authority.mode !== 'home') return
            if (!interaction.assertIntent('open_lifemap_from_sky')) return
            authorityActions.openLifeMap()
          }}
          onOpenFocus={() => {
            if (transition.interactionSuppressed) return
            if (authority.mode !== 'lifemap') return
            if (!stars[0]) return
            if (!interaction.assertIntent('open_focus_from_star')) return
            authorityActions.openFocus(stars[0].id)
          }}
          onOpenReplay={() => {
            if (transition.interactionSuppressed) return
            if (authority.mode !== 'focus') return
            if (!authority.selectedStar) return
            if (!interaction.assertIntent('open_replay_from_focus')) return
            authorityActions.openReplay(authority.selectedStar.id)
          }}
        />
      ) : null}
    </div>
  )
}
INNER_EOF

echo "=== TYPECHECK ==="
pnpm exec tsc --noEmit

echo "=== BUILD ==="
pnpm build

echo "=== PASS COMPLETE ==="
echo "AUDIT_DIR=$AUDIT_DIR"
echo "LOG_FILE=$LOG_FILE"
