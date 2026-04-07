'use client'

import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { STAR_DATA } from '@/lib/uraiCanon/starData'
import { resolveAtmosphere, type TransitionPhase } from '@/spatial/canon/cameraCanon'
import { CameraDirector, TransitionVeil } from '@/spatial/components/CameraDirector'
import useSceneAuthority from '@/spatial/hooks/useSceneAuthority'
import LifeMapStarfield from '@/spatial/components/LifeMapStarfield'
import FocusSubject from '@/spatial/components/FocusSubject'
import ReplayScene from '@/spatial/components/ReplayScene'
import HomeEnvironment from '@/spatial/components/HomeEnvironment'
import { useCanonEsc } from '../hooks/useCanonEsc'

type VisualStar = {
  id: string
  position: [number, number, number]
  size: number
  alpha: number
  tone: string
  band: 'near' | 'mid' | 'far'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toVisualStar(star: any, idx: number): VisualStar {
  const raw =
    Array.isArray(star?.position) && star.position.length === 3
      ? star.position
      : [Number(star?.x) || 0, Number(star?.y) || 0, Number(star?.z) || (-14 - idx * 5)]

  const z = clamp(Number(raw[2]) || -20, -58, -13)
  const band: 'near' | 'mid' | 'far' =
    z > -22 ? 'near' : z > -38 ? 'mid' : 'far'

  return {
    id: String(star?.id ?? `star-${idx + 1}`),
    position: [
      clamp((Number(raw[0]) || 0) * 2.2, -16, 16),
      clamp((Number(raw[1]) || 0) * 1.9, -9, 9),
      z,
    ],
    size:
      band === 'near'
        ? clamp((Number(star?.size) || 0.07) * 2.0, 0.10, 0.22)
        : band === 'mid'
          ? clamp((Number(star?.size) || 0.06) * 1.5, 0.06, 0.14)
          : clamp((Number(star?.size) || 0.05) * 1.1, 0.035, 0.08),
    alpha:
      band === 'near'
        ? clamp(Number(star?.intensity) || 0.9, 0.45, 1)
        : band === 'mid'
          ? clamp((Number(star?.intensity) || 0.8) * 0.8, 0.22, 0.72)
          : clamp((Number(star?.intensity) || 0.7) * 0.55, 0.10, 0.42),
    tone:
      typeof star?.tone === 'string'
        ? star.tone
        : typeof star?.color === 'string'
          ? star.color
          : '#dfe8ff',
    band,
  }
}

export default function SpatialScene() {
  const { authority, authorityActions } = useSceneAuthority({ stars: STAR_DATA })
  useCanonEsc(authority)

  const visualStars = useMemo<VisualStar[]>(
    () => (authority.stars ?? []).map((star: any, idx: number) => toVisualStar(star, idx)),
    [authority.stars]
  )

  const phase = (authority.transitionPhase ?? 'idle') as TransitionPhase
  const atmosphere = useMemo(
    () => resolveAtmosphere(authority.mode, phase),
    [authority.mode, phase]
  )

  const showHome =
    authority.mode === 'home' ||
    phase === 'ascent' ||
    phase === 'go_home'

  const showLifeMap =
    authority.mode === 'lifemap' ||
    authority.mode === 'focus' ||
    authority.mode === 'replay' ||
    phase === 'ascent' ||
    phase === 'arrive_lifemap' ||
    phase === 'open_focus' ||
    phase === 'open_replay' ||
    phase === 'close_focus' ||
    phase === 'close_replay'

  const showFocus =
    authority.mode === 'focus' ||
    authority.mode === 'replay' ||
    phase === 'open_focus' ||
    phase === 'open_replay' ||
    phase === 'close_focus' ||
    phase === 'close_replay'

  const showReplay =
    authority.mode === 'replay' ||
    phase === 'open_replay' ||
    phase === 'close_replay'

  const replayOpacity =
    phase === 'open_replay' ? 0.16 :
    phase === 'close_replay' ? 0.10 :
    showReplay ? 0.22 : 0

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: atmosphere.bgColor }}>
      <Canvas
        camera={{ position: [0, 1.1, 10.9], fov: 54, near: 0.1, far: 260 }}
        dpr={[1, 1.75]}
      >
        <CameraDirector mode={authority.mode} transitionPhase={phase} />

        <color attach="background" args={[atmosphere.bgColor]} />
        <fog attach="fog" args={atmosphere.fogArgs} />

        <ambientLight intensity={atmosphere.ambientLight} />
        <directionalLight
          position={[4, 8, 6]}
          intensity={atmosphere.directionalLightIntensity}
          color={atmosphere.directionalLightColor}
        />
        <pointLight
          position={atmosphere.pointLightPosition}
          intensity={atmosphere.pointLightIntensity}
          color={'#dfe8ff'}
          distance={atmosphere.pointLightDistance}
        />

        {showHome ? (
          <HomeEnvironment
            visible={true}
            onSkyOpen={() => authorityActions.openLifeMap()}
          />
        ) : null}

        {showLifeMap ? (
          <LifeMapStarfield
            visible={true}
            stars={visualStars}
            selectedStarId={authority.selectedStarId}
            onSelectStar={(id: string) => authorityActions.openFocus(id)}
          />
        ) : null}

        {showFocus ? (
          <FocusSubject
            visible={true}
            onEnterReplay={() => authorityActions.openReplay(authority.selectedStarId)}
          />
        ) : null}

        {showReplay ? (
          <ReplayScene
            active={showReplay}
            starId={authority.replayStarId ?? authority.selectedStarId}
            opacity={replayOpacity}
            visible={showReplay}
          />
        ) : null}

        <TransitionVeil mode={authority.mode} transitionPhase={phase} />
      </Canvas>
    </div>
  )
}
