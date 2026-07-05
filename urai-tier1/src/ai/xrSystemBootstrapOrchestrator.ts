// XR System Bootstrap Orchestrator
// Wires together event bus, memory, prediction engines, and learnable policies
// This is the single entrypoint for running URAI spatial cognition loop

import { XrEventBus, XrMemoryLayer, XrRuntimeCognitiveWire } from './xrEventBusMemoryLayer'
import { XRLearnablePolicyRuntime, XRState, PolicyFeedback } from './xrLearnablePolicyRuntime'
import { XrForwardPredictionEngine } from './xrForwardPredictionEngine'
import { XrPredictionEngineSelector, PredictionEngine } from './xrPredictionEngineSelector'

export type XRSystemConfig<T> = {
  initialState: T
  cognitive: { process: (input: any) => any }
}

export class XRSystemBootstrap<T> {
  private bus = new XrEventBus()
  private memory = new XrMemoryLayer()

  private policyRuntime = new XRLearnablePolicyRuntime<T>()
  private predictionSelector = new XrPredictionEngineSelector<T>()

  private state: XRState<T>

  constructor(private config: XRSystemConfig<T>) {
    this.state = {
      observation: config.initialState,
      context: {},
      timestamp: Date.now()
    }

    new XrRuntimeCognitiveWire(this.bus, this.memory, config.cognitive)
  }

  registerPolicy(policy: any) {
    this.policyRuntime.registerPolicy(policy)
  }

  registerPredictionEngine(engine: PredictionEngine<T>) {
    this.predictionSelector.register(engine)
  }

  emit(type: string, payload?: any, roomId: string = 'default') {
    this.bus.emit({
      type,
      payload,
      roomId,
      timestamp: Date.now()
    })
  }

  tick() {
    const action = this.policyRuntime.decide(this.state)
    const prediction = this.predictionSelector.predict(this.state.observation)

    this.state = {
      ...this.state,
      timestamp: Date.now(),
      context: {
        ...this.state.context,
        lastAction: action,
        lastPrediction: prediction
      }
    }

    this.bus.emit({
      type: 'system_tick',
      roomId: 'default',
      payload: { action, prediction },
      timestamp: Date.now()
    })

    return { action, prediction }
  }

  feedback(policyId: string, reward: number, error: number) {
    const feedback: PolicyFeedback = {
      policyId,
      reward,
      error,
      context: this.state.context
    }

    this.policyRuntime.update(feedback)
  }

  getMemory(roomId = 'default') {
    return this.memory.getRoomHistory(roomId)
  }

  getState() {
    return this.state
  }
}
