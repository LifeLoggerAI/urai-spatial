// XR Self-Evolving Prediction Engine
// Extends forward prediction with evolutionary policy mutation + selection pressure from error signals
// This creates a population of prediction policies that compete and evolve over time

import {
  XrForwardPredictionEngine,
  XrEvent,
  PredictionPolicy,
  Reducer,
  PredictionNode
} from './xrForwardPredictionEngine'

export type PolicySpec<T> = {
  id: string
  weight: number
  aggressiveness: number
  randomness: number
  bias?: Partial<Record<string, number>>
}

export type EvolutionConfig = {
  populationSize: number
  mutationRate: number
  selectionPressure: number
  decay: number
}

export class XrSelfEvolvingPredictionEngine<T> {
  private population: PolicySpec<T>[] = []
  private engine: XrForwardPredictionEngine<T>

  constructor(
    reducer: Reducer<T>,
    initialPolicy: PredictionPolicy<T>,
    private config: EvolutionConfig = {
      populationSize: 6,
      mutationRate: 0.2,
      selectionPressure: 0.7,
      decay: 0.95
    }
  ) {
    this.engine = new XrForwardPredictionEngine<T>(reducer, initialPolicy)

    for (let i = 0; i < this.config.populationSize; i++) {
      this.population.push(this.randomPolicy(i))
    }
  }

  private randomPolicy(seed: number): PolicySpec<T> {
    return {
      id: `policy_${seed}_${Math.random().toString(36).slice(2)}`,
      weight: 1,
      aggressiveness: Math.random(),
      randomness: Math.random()
    }
  }

  private buildPolicy(spec: PolicySpec<T>, base: PredictionPolicy<T>): PredictionPolicy<T> {
    return (state: T) => {
      const baseEvents = base(state)

      const shuffled = [...baseEvents]

      if (Math.random() < spec.randomness) {
        shuffled.push(...baseEvents.slice(0, 1))
      }

      const expanded = spec.aggressiveness > 0.5
        ? [...shuffled, ...shuffled]
        : shuffled

      return expanded
    }
  }

  simulateWithPopulation(rootState: T): PredictionNode<T>[][] {
    const results: PredictionNode<T>[][] = []

    for (const policy of this.population) {
      const policyEngine = new XrForwardPredictionEngine<T>(
        (this.engine as any)['reducer'],
        this.buildPolicy(policy, (this.engine as any)['policy']),
        3,
        4
      )

      const tree = policyEngine.simulate(rootState)
      results.push(tree.nodes)
    }

    return results
  }

  evolve(fitnessScores: Map<string, number>) {
    const ranked = this.population
      .map(p => ({
        policy: p,
        fitness: 1 - (fitnessScores.get(p.id) ?? 1)
      }))
      .sort((a, b) => b.fitness - a.fitness)

    const survivors = ranked.slice(
      0,
      Math.max(1, Math.floor(this.population.length * this.config.selectionPressure))
    )

    const newPopulation: PolicySpec<T>[] = []

    for (const s of survivors) {
      newPopulation.push(s.policy)
    }

    while (newPopulation.length < this.config.populationSize) {
      const parent = survivors[Math.floor(Math.random() * survivors.length)].policy
      newPopulation.push(this.mutate(parent))
    }

    this.population = newPopulation
  }

  private mutate(policy: PolicySpec<T>): PolicySpec<T> {
    return {
      ...policy,
      id: `${policy.id}_m_${Math.random().toString(36).slice(2)}`,
      aggressiveness: this.jitter(policy.aggressiveness),
      randomness: this.jitter(policy.randomness),
      weight: policy.weight * this.config.decay
    }
  }

  private jitter(value: number): number {
    const delta = (Math.random() - 0.5) * this.config.mutationRate
    return Math.max(0, Math.min(1, value + delta))
  }

  getPopulation() {
    return this.population
  }
}