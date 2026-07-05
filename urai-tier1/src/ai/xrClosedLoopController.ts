// XR Closed Loop Controller
// Connects XR runtime ↔ forward prediction engine ↔ replay memory
// Enables prediction feedback, error correction, and adaptive policy evolution

import { XrForwardPredictionEngine, XrEvent, PredictionNode } from './xrForwardPredictionEngine'

export type XrRuntime = {
  onEvent: (cb: (event: XrEvent) => void) => void
  emit?: (event: XrEvent) => void
  getState: () => any
}

export type PredictionMatch = {
  event: XrEvent
  predictedNodes: PredictionNode<any>[]
  error: number
}

export type ClosedLoopConfig<T> = {
  horizonDepth?: number
  learningRate?: number
  decay?: number
  enableSelfRewrite?: boolean
}

export class XrClosedLoopController<T> {
  private predictionEngine: XrForwardPredictionEngine<T>
  private runtime: XrRuntime

  private lastPredictionNodes: PredictionNode<T>[] = []

  constructor(
    runtime: XrRuntime,
    predictionEngine: XrForwardPredictionEngine<T>,
    private config: ClosedLoopConfig<T> = {}
  ) {
    this.runtime = runtime
    this.predictionEngine = predictionEngine
  }

  start() {
    // Subscribe to live XR events
    this.runtime.onEvent((event) => {
      this.processEvent(event)
    })

    // Initialize first prediction cycle
    this.recomputePredictions()
  }

  private processEvent(event: XrEvent) {
    const state = this.runtime.getState()

    // Compare event against predicted futures
    const matches = this.evaluatePrediction(event)

    // Apply error feedback signal
    const errorSignal = this.computeErrorSignal(matches)

    // Feed error back into system (policy adaptation hook)
    this.applyFeedback(errorSignal)

    // Recompute forward predictions after state change
    this.recomputePredictions()
  }

  private recomputePredictions() {
    const state = this.runtime.getState()

    const tree = this.predictionEngine.simulate(state)

    this.lastPredictionNodes = tree.nodes
  }

  private evaluatePrediction(event: XrEvent): PredictionMatch[] {
    const relevant = this.lastPredictionNodes.filter(n =>
      n.event?.type === event.type &&
      n.event?.roomId === event.roomId
    )

    return relevant.map(n => ({
      event,
      predictedNodes: [n],
      error: this.computeNodeError(n, event)
    }))
  }

  private computeNodeError(node: PredictionNode<T>, event: XrEvent): number {
    // Simple structural mismatch scoring (can be replaced with embedding distance)
    if (!node.event) return 1

    const typeMismatch = node.event.type !== event.type ? 1 : 0
    const roomMismatch = node.event.roomId !== event.roomId ? 1 : 0

    return (typeMismatch + roomMismatch) / 2
  }

  private computeErrorSignal(matches: PredictionMatch[]): number {
    if (matches.length === 0) return 1

    const avgError = matches.reduce((sum, m) => sum + m.error, 0) / matches.length
    return avgError
  }

  private applyFeedback(errorSignal: number) {
    const lr = this.config.learningRate ?? 0.1

    // Placeholder: this is where rule ecosystems / policy mutation hooks attach
    // Future: weight update, policy evolution, node reinforcement

    if (this.config.enableSelfRewrite && errorSignal > 0.5) {
      // Trigger adaptive evolution signal
      // (hook for rule ecosystem competition layer)
      this.emitAdaptationSignal(errorSignal * lr)
    }
  }

  private emitAdaptationSignal(value: number) {
    // Lightweight internal feedback signal
    // Can be wired into cognitive core / rule system
    console.log('[XR Closed Loop] adaptation signal:', value)
  }

  getPredictionState() {
    return this.lastPredictionNodes
  }
}