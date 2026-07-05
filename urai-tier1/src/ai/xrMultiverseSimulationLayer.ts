// Multi-Universe XR Physics Simulation Layer
// Enables parallel physics realities driven by memory graph divergence

import { XRPhysicsState } from './xrPhysicsMemoryController'
import { XRGlobalSharedCognitiveMemoryGraph } from './xrGlobalSharedCognitiveMemoryGraph'

export type XRUniverse = {
  id: string
  weight: number
  physics: XRPhysicsState
  divergenceScore: number
  parentId?: string
}

export class XRMultiverseSimulationLayer {
  private universes: Map<string, XRUniverse> = new Map()
  private activeUniverseId: string | null = null

  seedInitialUniverse(initialPhysics: XRPhysicsState) {
    const root: XRUniverse = {
      id: 'universe-root',
      weight: 1.0,
      divergenceScore: 0,
      physics: { ...initialPhysics }
    }

    this.universes.set(root.id, root)
    this.activeUniverseId = root.id
  }

  forkUniverse(fromId: string, mutationFactor: number): XRUniverse {
    const parent = this.universes.get(fromId)
    if (!parent) throw new Error('Universe not found')

    const id = `universe-${Math.random().toString(36).slice(2)}`

    const forked: XRUniverse = {
      id,
      parentId: fromId,
      weight: parent.weight * 0.8,
      divergenceScore: parent.divergenceScore + mutationFactor,
      physics: {
        gravity: parent.physics.gravity * (1 + mutationFactor * 0.1),
        timeDilation: parent.physics.timeDilation * (1 + mutationFactor * 0.2),
        spatialTension: parent.physics.spatialTension,
        coherenceField: parent.physics.coherenceField,
        causalityPressure: parent.physics.causalityPressure
      }
    }

    this.universes.set(id, forked)
    return forked
  }

  evolveFromMemory(
    graph: XRGlobalSharedCognitiveMemoryGraph,
    currentTime: number
  ) {
    const snapshot = graph.getStateAt(currentTime)

    let error = 0
    let causal = 0

    for (const node of snapshot.nodes.values()) {
      if (node.type === 'error') error++
      if (node.type === 'causal_inference') causal++
    }

    const instability = error / Math.max(snapshot.nodes.size, 1)

    if (instability > 0.3 && this.activeUniverseId) {
      const fork = this.forkUniverse(this.activeUniverseId, instability)
      this.activeUniverseId = fork.id
    }

    for (const universe of this.universes.values()) {
      universe.physics.timeDilation *= 1 + instability * 0.05
      universe.physics.coherenceField *= 1 - instability * 0.03
      universe.weight = Math.max(0.1, universe.physics.coherenceField)
    }
  }

  selectBestUniverse(): XRUniverse {
    let best: XRUniverse | null = null

    for (const u of this.universes.values()) {
      if (!best || u.weight > best.weight) best = u
    }

    if (!best) throw new Error('No universes exist')

    this.activeUniverseId = best.id
    return best
  }

  exportActivePhysics(): XRPhysicsState | null {
    if (!this.activeUniverseId) return null
    return this.universes.get(this.activeUniverseId)?.physics || null
  }

  getUniverseGraph() {
    return Array.from(this.universes.values()).map(u => ({
      id: u.id,
      parentId: u.parentId,
      weight: u.weight,
      divergence: u.divergenceScore
    }))
  }
}