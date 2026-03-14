// Deterministic Emotional Time Core physics + modulation engine

type MemoryNode = {
    id: string
    timestamp: number
    emotionalWeight: number
    stability: number
    x: number
    y: number
    z: number
  }
  
  type EmotionalFieldEntry = {
    id: string
    gravity: number
    dilation: number
    stability: number
    x: number
    y: number
    z: number
  }
  
  export type OrbState = {
    pulse: number
    colorShift: number
    surfaceIntensity: number
  }
  
  export type SceneModulation = {
    exposure: number
    bloom: number
    fogDensity: number
  }
  
  const EPSILON = 0.0001
  
  function distance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  
  function buildEmotionalField(nodes: MemoryNode[], time: number): EmotionalFieldEntry[] {
    return nodes.map(node => {
  
      const age = time - node.timestamp
      const recencyFactor = Math.exp(-age * 0.00000001)
  
      return {
        id: node.id,
        gravity: node.emotionalWeight * recencyFactor,
        dilation: 1 + node.emotionalWeight * 1.5,
        stability: node.stability,
        x: node.x,
        y: node.y,
        z: node.z
      }
  
    })
  }
  
  function applyGravity(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
  
    return nodes.map(node => {
  
      let dx = 0
      let dy = 0
      let dz = 0
  
      for (let i = 0; i < field.length; i++) {
  
        const f = field[i]
        if (f.id === node.id) continue
  
        const dist = distance(node, f) + EPSILON
        const force = f.gravity / (dist * dist)
  
        dx += (f.x - node.x) * force
        dy += (f.y - node.y) * force
        dz += (f.z - node.z) * force
  
      }
  
      return {
        ...node,
        x: node.x + dx * 0.01,
        y: node.y + dy * 0.01,
        z: node.z + dz * 0.01
      }
  
    })
  }
  
  function applyDilation(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
  
    const fieldMap = new Map(field.map(f => [f.id, f]))
  
    return nodes.map(node => {
  
      const f = fieldMap.get(node.id)
      if (!f) return node
  
      const dilation = f.dilation
  
      return {
        ...node,
        x: node.x * dilation,
        y: node.y,
        z: node.z * dilation
      }
  
    })
  }
  
  export function computeOrbState(field: EmotionalFieldEntry[]): OrbState {
  
    if (field.length === 0) {
      return { pulse: 0.8, colorShift: 0, surfaceIntensity: 0 }
    }
  
    let totalGravity = 0
  
    for (let i = 0; i < field.length; i++) {
      totalGravity += field[i].gravity
    }
  
    const avgGravity = totalGravity / field.length
  
    return {
      pulse: 0.8 + avgGravity * 1.5,
      colorShift: avgGravity,
      surfaceIntensity: avgGravity
    }
  }
  
  export function computeSceneModulation(orbState: OrbState): SceneModulation {
  
    const exposure = Math.max(0.6, Math.min(2.0, 1 + orbState.colorShift * 0.5))
    const bloom = Math.max(0.8, Math.min(2.5, 1 + orbState.surfaceIntensity))
    const fogDensity = Math.max(0.05, Math.min(0.5, 0.1 + orbState.colorShift * 0.2))
  
    return {
      exposure,
      bloom,
      fogDensity
    }
  }
  
  export function runEmotionalTimeEngine(nodes: MemoryNode[], time: number) {
  
    const emotionalField = buildEmotionalField(nodes, time)
  
    const gravityAppliedNodes = applyGravity(nodes, emotionalField)
  
    const finalNodePositions = applyDilation(gravityAppliedNodes, emotionalField)
  
    const orbState = computeOrbState(emotionalField)
  
    const sceneModulation = computeSceneModulation(orbState)
  
    return {
      nodes: finalNodePositions,
      orbState,
      sceneModulation
    }
  
  }