// XR Physics Controller driven by Global Cognitive Memory Graph
// This module turns memory + causality into real-time XR physics modulation

import { XRGlobalSharedCognitiveMemoryGraph } from './xrGlobalSharedCognitiveMemoryGraph'

export type XRPhysicsState = {
  gravity: number
  timeDilation: number
  spatialTension: number
  coherenceField: number
  causalityPressure: number
}

export class XRPhysicsMemoryController {
  private state: XRPhysicsState = {
    gravity: 1.0,
    timeDilation: 1.0,
    spatialTension: 0.5,
    coherenceField: 0.5,
    causalityPressure: 0.5
  }

  // --- CORE LOOP ---
  applyMemoryGraph(graph: XRGlobalSharedCognitiveMemoryGraph, currentTime: number) {
    const snapshot = graph.getStateAt(currentTime)

    let causalDensity = 0
    let errorSignal = 0
    let predictionCount = 0

    for (const node of snapshot.nodes.values()) {
      switch (node.type) {
        case 'causal_inference':
          causalDensity += 1
          break
        case 'error':
          errorSignal += 1
          break
        case 'prediction':
          predictionCount += 1
          break
      }
    }

    const totalNodes = snapshot.nodes.size || 1

    const normalizedCausal = causalDensity / totalNodes
    const normalizedError = errorSignal / totalNodes
    const normalizedPrediction = predictionCount / totalNodes

    // --- PHYSICS MODULATION RULES ---

    // 1. Causality strengthens spatial structure rigidity
    this.state.spatialTension = clamp(0.2 + normalizedCausal * 2.0, 0, 2)

    // 2. Errors distort time flow (instability = time dilation)
    this.state.timeDilation = clamp(1.0 + normalizedError * 3.0, 0.2, 5.0)

    // 3. Predictions stabilize gravity field (future anchoring)
    this.state.gravity = clamp(1.0 - normalizedPrediction * 0.5, 0.1, 2.0)

    // 4. Coherence emerges from causal + prediction alignment
    this.state.coherenceField = clamp(
      1.0 - Math.abs(normalizedPrediction - normalizedCausal),
      0,
      1
    )

    // 5. Causal pressure = system-wide memory compression force
    this.state.causalityPressure = clamp(
      normalizedCausal * 1.5 + normalizedError * 1.2,
      0,
      3
    )

    return this.state
  }

  // --- APPLY TO XR ENGINE ---
  exportXRUniforms() {
    return {
      u_gravity: this.state.gravity,
      u_timeDilation: this.state.timeDilation,
      u_spatialTension: this.state.spatialTension,
      u_coherenceField: this.state.coherenceField,
      u_causalityPressure: this.state.causalityPressure
    }
  }

  // --- FEEDBACK LOOP ---
  ingestPhysicsOutcome(stabilityDelta: number, anomalyDetected: boolean) {
    // system self-corrects physics based on XR reality feedback

    if (anomalyDetected) {
      this.state.causalityPressure *= 1.1
      this.state.coherenceField *= 0.95
    }

    this.state.gravity = clamp(this.state.gravity + stabilityDelta * 0.1, 0.1, 2.0)
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}