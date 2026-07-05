// Emergent Civilization Layer over XR Multiverse Physics
// Agents, societies, economies, and memetic evolution emerging from simulation pressure

import { XRUniverse } from './xrMultiverseSimulationLayer'

export type XRAgent = {
  id: string
  energy: number
  memory: number
  adaptationRate: number
  universeId: string
  lineage: string[]
}

export type XRSociety = {
  id: string
  universeId: string
  agents: Set<string>
  cohesion: number
  sharedBeliefStrength: number
  resourcePool: number
}

export type XRCivilizationSnapshot = {
  universeId: string
  societies: XRSociety[]
  totalAgents: number
  entropy: number
  stabilityIndex: number
}

export class XREmergentCivilizationLayer {
  private agents: Map<string, XRAgent> = new Map()
  private societies: Map<string, XRSociety> = new Map()

  seedCivilization(universe: XRUniverse, initialAgents: number = 50) {
    for (let i = 0; i < initialAgents; i++) {
      const id = `agent-${universe.id}-${i}-${Math.random().toString(36).slice(2)}`

      this.agents.set(id, {
        id,
        energy: 1.0,
        memory: Math.random(),
        adaptationRate: 0.1 + Math.random() * 0.2,
        universeId: universe.id,
        lineage: []
      })
    }

    const society: XRSociety = {
      id: `society-${universe.id}`,
      universeId: universe.id,
      agents: new Set(Array.from(this.agents.keys())),
      cohesion: 0.5,
      sharedBeliefStrength: 0.2,
      resourcePool: 10
    }

    this.societies.set(society.id, society)
  }

  stepEvolution(universe: XRUniverse, deltaTime: number) {
    const universeAgents = Array.from(this.agents.values())
      .filter(a => a.universeId === universe.id)

    for (const agent of universeAgents) {
      const consumption = 0.01 * deltaTime * universe.physics.causalityPressure
      agent.energy -= consumption

      const instabilityFactor = 1 - universe.physics.coherenceField
      agent.memory += instabilityFactor * agent.adaptationRate

      if (agent.energy > 1.5) {
        this.spawnOffspring(agent, universe.id)
        agent.energy *= 0.6
      }

      if (agent.energy <= 0) {
        this.agents.delete(agent.id)
      }
    }

    const society = Array.from(this.societies.values())
      .find(s => s.universeId === universe.id)

    if (society) {
      const size = society.agents.size
      society.cohesion = Math.min(1, size / 100)
      society.sharedBeliefStrength += universe.physics.timeDilation * 0.01
      society.resourcePool += universe.physics.coherenceField * 0.05
    }
  }

  private spawnOffspring(parent: XRAgent, universeId: string) {
    const child: XRAgent = {
      id: `agent-${universeId}-${Math.random().toString(36).slice(2)}`,
      energy: 0.8,
      memory: parent.memory * (0.9 + Math.random() * 0.2),
      adaptationRate: parent.adaptationRate * (0.9 + Math.random() * 0.2),
      universeId,
      lineage: [...parent.lineage, parent.id]
    }

    this.agents.set(child.id, child)
  }

  analyzeUniverse(universe: XRUniverse): XRCivilizationSnapshot {
    const agents = Array.from(this.agents.values())
      .filter(a => a.universeId === universe.id)

    const societies = Array.from(this.societies.values())
      .filter(s => s.universeId === universe.id)

    const avgEnergy = agents.reduce((a, b) => a + b.energy, 0) / Math.max(agents.length, 1)
    const entropy = 1 - universe.physics.coherenceField
    const stabilityIndex = (avgEnergy * universe.weight) / (1 + entropy)

    return {
      universeId: universe.id,
      societies,
      totalAgents: agents.length,
      entropy,
      stabilityIndex
    }
  }

  applySelectionPressure(universe: XRUniverse) {
    const snapshot = this.analyzeUniverse(universe)

    if (snapshot.entropy > 0.6) {
      for (const agent of this.agents.values()) {
        if (agent.universeId === universe.id) {
          agent.memory *= 0.95
          agent.energy *= 0.98
        }
      }
    }

    if (snapshot.stabilityIndex > 1.2) {
      for (const agent of this.agents.values()) {
        if (agent.universeId === universe.id) {
          agent.energy += 0.02
        }
      }
    }
  }

  exportSnapshot(universeId: string): XRCivilizationSnapshot | null {
    const dummyUniverse: XRUniverse = {
      id: universeId,
      weight: 1,
      divergenceScore: 0,
      physics: {
        gravity: 1,
        timeDilation: 1,
        spatialTension: 1,
        coherenceField: 1,
        causalityPressure: 1
      }
    }

    return this.analyzeUniverse(dummyUniverse)
  }

  getAgentCount() {
    return this.agents.size
  }
}