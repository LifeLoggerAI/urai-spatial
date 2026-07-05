// XR Prediction Engine Selector (Dynamic Routing Layer)
// This system dynamically selects the best-performing prediction engine per context/state
// It sits ABOVE all prediction engines (forward, evolving, ensemble variants)
// and acts as a real-time arbitration + routing layer.

import { PredictionNode } from './xrForwardPredictionEngine'

export interface PredictionEngine<T> {
  id: string
  predict: (state: T) => PredictionNode<T>[]
  score?: (state: T, prediction: PredictionNode<T>[]) => number
}

export type EnginePerformanceRecord = {
  engineId: string
  error: number
  reward: number
  timestamp: number
}

export type SelectorConfig = {
  explorationRate: number
  decay: number
  windowSize: number
}

export class XrPredictionEngineSelector<T> {
  private engines: Map<string, PredictionEngine<T>> = new Map()
  private history: EnginePerformanceRecord[] = []

  private usageCounts: Map<string, number> = new Map()
  private valueEstimates: Map<string, number> = new Map()

  constructor(private config: SelectorConfig = {
    explorationRate: 0.15,
    decay: 0.98,
    windowSize: 200
  }) {}

  registerEngine(engine: PredictionEngine<T>) {
    this.engines.set(engine.id, engine)
    this.usageCounts.set(engine.id, 1)
    this.valueEstimates.set(engine.id, 0)
  }

  // Core decision: select best engine for this state
  selectEngine(state: T): PredictionEngine<T> {
    const engines = Array.from(this.engines.values())

    // exploration: occasionally pick random engine
    if (Math.random() < this.config.explorationRate) {
      return engines[Math.floor(Math.random() * engines.length)]
    }

    // exploitation: UCB-style selection
    let bestEngine = engines[0]
    let bestScore = -Infinity

    for (const engine of engines) {
      const id = engine.id

      const value = this.valueEstimates.get(id) ?? 0
      const count = this.usageCounts.get(id) ?? 1

      const explorationBonus = Math.sqrt(Math.log(this.totalUsage() + 1) / count)

      const score = value + explorationBonus

      if (score > bestScore) {
        bestScore = score
        bestEngine = engine
      }
    }

    return bestEngine
  }

  // Run prediction using best engine dynamically
  predict(state: T): PredictionNode<T>[] {
    const engine = this.selectEngine(state)
    const prediction = engine.predict(state)

    this.recordUsage(engine.id)

    return prediction
  }

  // Feedback loop: update engine quality from real outcome
  updatePerformance(engineId: string, error: number, reward: number) {
    this.history.push({
      engineId,
      error,
      reward,
      timestamp: Date.now()
    })

    if (this.history.length > this.config.windowSize) {
      this.history.shift()
    }

    const prev = this.valueEstimates.get(engineId) ?? 0
    const updated = prev * this.config.decay + (reward - error)

    this.valueEstimates.set(engineId, updated)
  }

  private recordUsage(engineId: string) {
    const current = this.usageCounts.get(engineId) ?? 0
    this.usageCounts.set(engineId, current + 1)
  }

  private totalUsage(): number {
    return Array.from(this.usageCounts.values()).reduce((a, b) => a + b, 0)
  }

  // optional: remove underperforming engines
  prune(threshold: number = -10) {
    for (const [id, value] of this.valueEstimates.entries()) {
      if (value < threshold) {
        this.engines.delete(id)
        this.valueEstimates.delete(id)
        this.usageCounts.delete(id)
      }
    }
  }

  getBestEngine(): string | null {
    let best: string | null = null
    let bestVal = -Infinity

    for (const [id, val] of this.valueEstimates.entries()) {
      if (val > bestVal) {
        bestVal = val
        best = id
      }
    }

    return best
  }
}