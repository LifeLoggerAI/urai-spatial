import { SpatialRenderBudget, resolveSpatialRenderBudget } from '../spatial/visual/aaaMaterials'

export type HomeSceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'

export type HomeSceneVisualBudget = {
  mode: HomeSceneMode
  budget: SpatialRenderBudget
  canvasDpr: [number, number]
  shadowMapSize: SpatialRenderBudget['shadowMapSize']
  stageBudgetAttributes: {
    'data-render-budget-quality-tier': SpatialRenderBudget['qualityTier']
    'data-render-budget-atmosphere-mode': SpatialRenderBudget['atmosphereMode']
    'data-render-budget-reflection-mode': SpatialRenderBudget['reflectionMode']
    'data-render-budget-max-dpr': string
    'data-render-budget-particle-budget': string
  }
}

type HomeSceneVisualBudgetInput =
  | {
      mode: HomeSceneMode
      sceneMode?: never
      reducedMotion: boolean
    }
  | {
      mode?: never
      sceneMode: HomeSceneMode
      reducedMotion: boolean
    }

function qualityTierForMode(mode: HomeSceneMode, reducedMotion: boolean): SpatialRenderBudget['qualityTier'] {
  if (reducedMotion) return 'low'
  if (mode === 'demo' || mode === 'life-map' || mode === 'ascent') return 'medium'
  return 'high'
}

export function resolveHomeSceneVisualBudget(input: HomeSceneVisualBudgetInput): HomeSceneVisualBudget {
  const mode = 'sceneMode' in input ? input.sceneMode : input.mode
  const { reducedMotion } = input
  const budget = resolveSpatialRenderBudget({
    reducedMotion,
    qualityTier: qualityTierForMode(mode, reducedMotion),
  })

  return {
    mode,
    budget,
    canvasDpr: [1, budget.maxDpr],
    shadowMapSize: budget.shadowMapSize,
    stageBudgetAttributes: {
      'data-render-budget-quality-tier': budget.qualityTier,
      'data-render-budget-atmosphere-mode': budget.atmosphereMode,
      'data-render-budget-reflection-mode': budget.reflectionMode,
      'data-render-budget-max-dpr': String(budget.maxDpr),
      'data-render-budget-particle-budget': String(budget.particleBudget),
    },
  }
}
