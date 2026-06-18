'use client'

import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import HomeScene from './HomeScene'
import FocusChamber from './FocusChamber'
import ReplayTemporalField from './ReplayTemporalField'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import { REPLAY_DURATION_MS } from '../spatial/scene/replayState'
import { resolveHomeSceneVisualBudget } from './homeSceneVisualBudget'
import { HomeSceneVisualBudgetProvider } from './homeSceneVisualBudgetContext'

export type IntegratedSceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'

function AaaModeWorldOverlay({ sceneMode }: { sceneMode: IntegratedSceneMode }) {
  const reducedMotion = useReducedMotion()
  const visualBudget = resolveHomeSceneVisualBudget({ mode: sceneMode, reducedMotion })
  const { budget } = visualBudget
  const showFocus = sceneMode === 'focus'
  const showReplay = sceneMode === 'replay'

  if (!showFocus && !showReplay) return null

  return (
    <div
      className="urai-aaa-mode-world-overlay"
      data-testid="urai-aaa-mode-world-overlay"
      data-aaa-scene-mode={sceneMode}
      data-aaa-quality-tier={budget.qualityTier}
      data-aaa-reflection-mode={budget.reflectionMode}
      data-aaa-atmosphere-mode={budget.atmosphereMode}
      data-aaa-particle-budget={budget.particleBudget}
      data-aaa-max-dpr={budget.maxDpr}
      aria-hidden="true"
    >
      <Canvas
        shadows={visualBudget.shadowMapSize >= 1536}
        dpr={visualBudget.canvasDpr}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.65, 4.8]} fov={42} />
        <ambientLight intensity={showFocus ? 0.18 : 0.12} color="#b8d7ff" />
        <hemisphereLight args={['#dbeafe', '#050816', showFocus ? 0.52 : 0.42]} />
        {showFocus ? <FocusChamber active reducedMotion={reducedMotion} /> : null}
        {showReplay ? <ReplayTemporalField active reducedMotion={reducedMotion} progressMs={REPLAY_DURATION_MS * 0.38} durationMs={REPLAY_DURATION_MS} segmentId="runtime-overlay" /> : null}
      </Canvas>
    </div>
  )
}

export default function UraiIntegratedHomeScene({ sceneMode = 'home' }: { sceneMode?: IntegratedSceneMode }) {
  const reducedMotion = useReducedMotion()
  const visualBudget = resolveHomeSceneVisualBudget({ mode: sceneMode, reducedMotion })
  const { budget } = visualBudget

  return (
    <div
      className="urai-integrated-home-scene urai-home-shell"
      data-testid="urai-integrated-home-scene"
      data-urai-home-spatial-shell="true"
      data-integrated-scene-mode={sceneMode}
      data-scene-mode={sceneMode}
      data-integrated-quality-tier={budget.qualityTier}
      data-integrated-reflection-mode={budget.reflectionMode}
      data-integrated-shadow-map-size={visualBudget.shadowMapSize}
      data-integrated-atmosphere-mode={budget.atmosphereMode}
      data-integrated-max-dpr={budget.maxDpr}
      data-integrated-particle-budget={budget.particleBudget}
      style={{ position: 'relative', minHeight: '100svh' }}
    >
      <HomeSceneVisualBudgetProvider value={visualBudget}>
        <HomeScene sceneMode={sceneMode} />
        <AaaModeWorldOverlay sceneMode={sceneMode} />
      </HomeSceneVisualBudgetProvider>
    </div>
  )
}
