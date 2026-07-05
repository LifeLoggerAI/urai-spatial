// Inter-Universe Communication Layer
// Enables message passing, entanglement links, and causal exchange between simulated universes

import { XRUniverse } from './xrMultiverseSimulationLayer'

export type XRInterUniverseMessage = {
  id: string
  fromUniverse: string
  toUniverse: string
  type: 'MEMORY_SYNC' | 'RESOURCE_TRANSFER' | 'EVENT_ECHO' | 'CIVILIZATION_SIGNAL' | 'PHYSICS_PATCH'
  payload: any
  timestamp: number
  latency: number
  cost: number
}

export type XRUniverseLink = {
  a: string
  b: string
  bandwidth: number
  stability: number
  entanglementStrength: number
}

export type XRCommunicationSnapshot = {
  totalMessages: number
  activeLinks: number
  averageLatency: number
  totalEnergyCost: number
}

export class XRInterUniverseCommunicationLayer {
  private messages: XRInterUniverseMessage[] = []
  private links: Map<string, XRUniverseLink> = new Map()

  // --- LINK CREATION (ENTANGLEMENT) ---
  createLink(universeA: XRUniverse, universeB: XRUniverse) {
    const key = this.linkKey(universeA.id, universeB.id)

    this.links.set(key, {
      a: universeA.id,
      b: universeB.id,
      bandwidth: 1.0,
      stability: 0.8,
      entanglementStrength: Math.random() * 0.5 + 0.5
    })
  }

  // --- MESSAGE PASSING ---
  sendMessage(
    from: XRUniverse,
    to: XRUniverse,
    type: XRInterUniverseMessage['type'],
    payload: any
  ): XRInterUniverseMessage | null {

    const link = this.links.get(this.linkKey(from.id, to.id))

    if (!link || link.stability < 0.2) return null

    const cost = this.calculateCost(from, to, payload)
    const latency = this.calculateLatency(link)

    const message: XRInterUniverseMessage = {
      id: `msg-${Math.random().toString(36).slice(2)}`,
      fromUniverse: from.id,
      toUniverse: to.id,
      type,
      payload,
      timestamp: Date.now(),
      latency,
      cost
    }

    this.messages.push(message)

    // apply causal cost to universes
    from.weight -= cost * 0.01
    to.weight += cost * 0.005

    return message
  }

  // --- MESSAGE PROCESSING ---
  processMessages() {
    const now = Date.now()

    for (const msg of this.messages) {
      if (now - msg.timestamp >= msg.latency) {
        this.deliverMessage(msg)
      }
    }

    // remove delivered
    this.messages = this.messages.filter(m => now - m.timestamp < m.latency)
  }

  private deliverMessage(msg: XRInterUniverseMessage) {
    // In full system: would mutate target universe state
    switch (msg.type) {
      case 'MEMORY_SYNC':
        // shared memory propagation
        break
      case 'RESOURCE_TRANSFER':
        // energy / compute transfer
        break
      case 'EVENT_ECHO':
        // historical echo injection
        break
      case 'CIVILIZATION_SIGNAL':
        // civilization layer influence
        break
      case 'PHYSICS_PATCH':
        // modify physics constants
        break
    }
  }

  // --- NETWORK DYNAMICS ---
  updateNetwork(universes: XRUniverse[]) {
    // decay unstable links
    for (const link of this.links.values()) {
      link.stability *= 0.999
      link.bandwidth = Math.max(0.1, link.bandwidth * 0.999)
    }

    // spontaneous entanglement formation
    for (let i = 0; i < universes.length; i++) {
      for (let j = i + 1; j < universes.length; j++) {
        const a = universes[i]
        const b = universes[j]

        const divergence = Math.abs(a.divergenceScore - b.divergenceScore)

        if (divergence < 0.3 && Math.random() < 0.05) {
          this.createLink(a, b)
        }
      }
    }
  }

  // --- ANALYSIS ---
  analyze(): XRCommunicationSnapshot {
    const totalLatency = this.messages.reduce((a, b) => a + b.latency, 0)
    const totalCost = this.messages.reduce((a, b) => a + b.cost, 0)

    return {
      totalMessages: this.messages.length,
      activeLinks: this.links.size,
      averageLatency: this.messages.length ? totalLatency / this.messages.length : 0,
      totalEnergyCost: totalCost
    }
  }

  // --- UTILS ---
  private calculateCost(from: XRUniverse, to: XRUniverse, payload: any): number {
    const size = JSON.stringify(payload).length
    const divergence = Math.abs(from.divergenceScore - to.divergenceScore)
    return size * 0.001 + divergence * 10
  }

  private calculateLatency(link: XRUniverseLink): number {
    return Math.max(10, 100 / link.bandwidth)
  }

  private linkKey(a: string, b: string): string {
    return [a, b].sort().join('::')
  }

  // --- DEBUG ---
  getMessageCount() {
    return this.messages.length
  }

  getLinkCount() {
    return this.links.size
  }
}