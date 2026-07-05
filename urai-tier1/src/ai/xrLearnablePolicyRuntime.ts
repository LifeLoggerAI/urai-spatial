// XR Learnable Policy Runtime
// Turns XR runtime into a trainable policy system with reward + error-driven evolution

export type XRState<T> = {
  observation: T
  context: Record<string, any>
  timestamp: number
}

export type XRAction = {
  type: string
  payload?: any
  confidence: number
}

export type PolicyResult = {
  action: XRAction
  valueEstimate: number
  policyId: string
}

export type PolicyFeedback = {
  policyId: string
  reward: number
  error: number
  context?: any
}

export interface XRPolicy<T> {
  id: string
  act: (state: XRState<T>) => PolicyResult
  learn: (feedback: PolicyFeedback) => void
}

export class XRLearnablePolicyRuntime<T> {
  private policies: Map<string, XRPolicy<T>> = new Map()
  private policyWeights: Map<string, number> = new Map()
  private policyUsage: Map<string, number> = new Map()

  private explorationRate = 0.12
  private decay = 0.97

  registerPolicy(policy: XRPolicy<T>) {
    this.policies.set(policy.id, policy)
    this.policyWeights.set(policy.id, 0)
    this.policyUsage.set(policy.id, 1)
  }

  decide(state: XRState<T>): XRAction {
    const policies = Array.from(this.policies.values())

    if (Math.random() < this.explorationRate) {
      return policies[Math.floor(Math.random() * policies.length)].act(state).action
    }

    let best: XRPolicy<T> = policies[0]
    let bestScore = -Infinity

    for (const p of policies) {
      const w = this.policyWeights.get(p.id) ?? 0
      const u = this.policyUsage.get(p.id) ?? 1
      const score = w + Math.sqrt(Math.log(this.totalUsage() + 1) / u)

      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }

    const result = best.act(state)
    this.recordUsage(best.id)

    return result.action
  }

  update(feedback: PolicyFeedback) {
    const current = this.policyWeights.get(feedback.policyId) ?? 0
    const updated = current * this.decay + (feedback.reward - feedback.error)

    this.policyWeights.set(feedback.policyId, updated)

    const policy = this.policies.get(feedback.policyId)
    if (policy) policy.learn(feedback)
  }

  prune(threshold = -5) {
    for (const [id, w] of this.policyWeights.entries()) {
      if (w < threshold) {
        this.policies.delete(id)
        this.policyWeights.delete(id)
        this.policyUsage.delete(id)
      }
    }
  }

  getBestPolicy(): string | null {
    let best: string | null = null
    let bestVal = -Infinity

    for (const [id, v] of this.policyWeights.entries()) {
      if (v > bestVal) {
        bestVal = v
        best = id
      }
    }

    return best
  }

  private recordUsage(id: string) {
    this.policyUsage.set(id, (this.policyUsage.get(id) ?? 0) + 1)
  }

  private totalUsage(): number {
    return Array.from(this.policyUsage.values()).reduce((a, b) => a + b, 0)
  }
}