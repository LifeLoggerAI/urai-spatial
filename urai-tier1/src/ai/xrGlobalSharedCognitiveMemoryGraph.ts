// Global Shared Cognitive Memory Graph
// Unifies multi-user XR memory, causal structure, prediction traces, and policy evolution into one shared graph

import { XRInteractionEvent } from './xrMultiUserCoEvolutionLayer'

export type MemoryNodeType =
  | 'observation'
  | 'action'
  | 'prediction'
  | 'reward'
  | 'error'
  | 'policy_change'
  | 'causal_inference'

export type MemoryNode = {
  id: string
  type: MemoryNodeType
  timestamp: number
  userId?: string
  payload: any
  embedding?: number[]
}

export type MemoryEdge = {
  id: string
  from: string
  to: string
  type: 'causal' | 'temporal' | 'semantic' | 'counterfactual'
  weight: number
  metadata?: any
}

export type CognitiveMemoryState = {
  nodes: Map<string, MemoryNode>
  edges: Map<string, MemoryEdge>
}

export class XRGlobalSharedCognitiveMemoryGraph {
  private nodes = new Map<string, MemoryNode>()
  private edges = new Map<string, MemoryEdge>()

  // --- NODE CREATION ---
  addNode(node: MemoryNode) {
    this.nodes.set(node.id, node)
    return node
  }

  // --- EDGE CREATION ---
  addEdge(edge: MemoryEdge) {
    this.edges.set(edge.id, edge)
    return edge
  }

  // --- INGEST EVENTS FROM XR SYSTEM ---
  ingestInteraction(event: XRInteractionEvent) {
    const baseId = `${event.from}-${event.timestamp}`

    const node: MemoryNode = {
      id: baseId,
      type: 'observation',
      timestamp: event.timestamp,
      userId: event.from,
      payload: event
    }

    this.addNode(node)

    if (event.to) {
      const edge: MemoryEdge = {
        id: `${baseId}-causal`,
        from: node.id,
        to: event.to,
        type: 'causal',
        weight: 1.0,
        metadata: { source: 'interaction' }
      }

      this.addEdge(edge)
    }
  }

  // --- CAUSAL LINKING ENGINE ---
  inferCausality(windowMs: number = 5000) {
    const nodes = Array.from(this.nodes.values()).sort((a, b) => a.timestamp - b.timestamp)

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        if (b.timestamp - a.timestamp > windowMs) break

        const weight = this.computeCausalWeight(a, b)
        if (weight > 0.6) {
          this.addEdge({
            id: `${a.id}->${b.id}`,
            from: a.id,
            to: b.id,
            type: 'causal',
            weight
          })
        }
      }
    }
  }

  // --- SIMPLE CAUSAL SCORING ---
  private computeCausalWeight(a: MemoryNode, b: MemoryNode): number {
    let score = 0

    if (a.userId && b.userId && a.userId === b.userId) {
      score += 0.3
    }

    if (a.type === 'action' && b.type === 'observation') {
      score += 0.4
    }

    if (a.type === 'prediction' && b.type === 'error') {
      score += 0.5
    }

    const dt = Math.abs(b.timestamp - a.timestamp)
    if (dt < 2000) score += 0.3

    return Math.min(score, 1)
  }

  // --- TEMPORAL SCRUBBING ---
  getStateAt(time: number): CognitiveMemoryState {
    const nodes = new Map<string, MemoryNode>()
    const edges = new Map<string, MemoryEdge>()

    for (const [id, node] of this.nodes) {
      if (node.timestamp <= time) nodes.set(id, node)
    }

    for (const [id, edge] of this.edges) {
      const from = this.nodes.get(edge.from)
      const to = this.nodes.get(edge.to)
      if (from && to && from.timestamp <= time && to.timestamp <= time) {
        edges.set(id, edge)
      }
    }

    return { nodes, edges }
  }

  // --- QUERY ---
  traceCausalChain(nodeId: string, depth = 5): string[] {
    const chain: string[] = []
    let current = nodeId

    for (let i = 0; i < depth; i++) {
      const incoming = Array.from(this.edges.values()).find(e => e.to === current)
      if (!incoming) break

      chain.push(incoming.from)
      current = incoming.from
    }

    return chain
  }

  // --- EXPORT ---
  getGraph() {
    return {
      nodes: this.nodes,
      edges: this.edges
    }
  }
}