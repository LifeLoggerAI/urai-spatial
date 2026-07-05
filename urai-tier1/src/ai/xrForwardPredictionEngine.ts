// XR Forward Prediction Simulation Engine
// Builds probabilistic future timelines from current XR state using deterministic reducer + policy-driven branching

export type XrEvent = {
  type: string
  roomId: string
  payload?: any
  timestamp?: number
}

export type PredictionNode<T> = {
  state: T
  event?: XrEvent
  probability: number
  depth: number
  parentId?: string
  id: string
}

export type PredictionBranch<T> = {
  rootState: T
  nodes: PredictionNode<T>[]
}

// Policy generates possible next events from a state
export type PredictionPolicy<T> = (state: T) => XrEvent[]

// Reducer already exists in replay engine style
export type Reducer<T> = (state: T, event: XrEvent) => T

export class XrForwardPredictionEngine<T> {
  constructor(
    private reducer: Reducer<T>,
    private policy: PredictionPolicy<T>,
    private branchFactor: number = 3,
    private depthLimit: number = 5
  ) {}

  private cloneId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2)}`
  }

  // Generate future simulation tree
  simulate(rootState: T): PredictionBranch<T> {
    const rootNode: PredictionNode<T> = {
      id: this.cloneId('root'),
      state: rootState,
      probability: 1,
      depth: 0
    }

    const nodes: PredictionNode<T>[] = [rootNode]
    const queue: PredictionNode<T>[] = [rootNode]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.depth >= this.depthLimit) continue

      const candidates = this.policy(current.state)
        .slice(0, this.branchFactor)

      const probStep = candidates.length > 0 ? 1 / candidates.length : 0

      for (const event of candidates) {
        const newState = this.reducer(current.state, event)

        const node: PredictionNode<T> = {
          id: this.cloneId('node'),
          state: newState,
          event,
          probability: current.probability * probStep,
          depth: current.depth + 1,
          parentId: current.id
        }

        nodes.push(node)
        queue.push(node)
      }
    }

    return {
      rootState,
      nodes
    }
  }

  // Extract most likely future path
  getMostLikelyPath<T extends any>(branch: PredictionBranch<T>): PredictionNode<T>[] {
    const byParent = new Map<string, PredictionNode<T>[]>()

    for (const n of branch.nodes) {
      if (!n.parentId) continue
      const list = byParent.get(n.parentId) ?? []
      list.push(n)
      byParent.set(n.parentId, list)
    }

    const root = branch.nodes.find(n => n.depth === 0)
    if (!root) return []

    const path: PredictionNode<T>[] = []
    let current: PredictionNode<T> | undefined = root

    while (current) {
      path.push(current)
      const children = byParent.get(current.id) ?? []
      current = children.sort((a, b) => b.probability - a.probability)[0]
    }

    return path
  }

  // Collapse prediction into next-step suggestion
  predictNext(rootState: T): PredictionNode<T>[] {
    const tree = this.simulate(rootState)

    return tree.nodes
      .filter(n => n.depth === 1)
      .sort((a, b) => b.probability - a.probability)
  }
}