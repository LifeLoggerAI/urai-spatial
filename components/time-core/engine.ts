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

const EPSILON = 0.001
const MAX_FORCE = 0.02
const POSITION_BLEND = 0.12
const RECENCY_HALF_LIFE_MS = 1000 * 60 * 60 * 24 * 30

function distanceSquared(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function buildEmotionalField(nodes: MemoryNode[], time: number): EmotionalFieldEntry[] {
  return nodes.map((node) => {
    const age = Math.max(0, time - node.timestamp)
    const recencyFactor = Math.exp((-Math.log(2) * age) / RECENCY_HALF_LIFE_MS)

    return {
      id: node.id,
      gravity: node.emotionalWeight * recencyFactor,
      dilation: 1 + node.emotionalWeight * 0.25 * recencyFactor,
      stability: clamp(node.stability, 0, 1),
      x: node.x,
      y: node.y,
      z: node.z,
    }
  })
}

function applyGravity(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
  return nodes.map((node) => {
    let dx = 0
    let dy = 0
    let dz = 0

    for (let i = 0; i < field.length; i++) {
      const f = field[i]
      if (f.id === node.id) continue

      const distSq = distanceSquared(node, f) + EPSILON
      const dist = Math.sqrt(distSq)
      const force = Math.min(MAX_FORCE, f.gravity / distSq)

      dx += ((f.x - node.x) / dist) * force
      dy += ((f.y - node.y) / dist) * force
      dz += ((f.z - node.z) / dist) * force
    }

    const damping = 1 - clamp(node.stability, 0, 1) * 0.7

    return {
      ...node,
      x: node.x + dx * damping,
      y: node.y + dy * damping,
      z: node.z + dz * damping,
    }
  })
}

function applyDilation(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
  const fieldMap = new Map(field.map((f) => [f.id, f]))

  return nodes.map((node) => {
    const f = fieldMap.get(node.id)
    if (!f) return node

    const dilation = f.dilation
    const radiusX = node.x
    const radiusZ = node.z

    return {
      ...node,
      x: radiusX * (1 + (dilation - 1) * POSITION_BLEND),
      y: node.y,
      z: radiusZ * (1 + (dilation - 1) * POSITION_BLEND),
    }
  })
}

export function computeOrbState(field: EmotionalFieldEntry[]): OrbState {
  if (field.length === 0) {
    return { pulse: 0.8, colorShift: 0, surfaceIntensity: 0 }
  }

  let totalGravity = 0
  let totalStability = 0

  for (let i = 0; i < field.length; i++) {
    totalGravity += field[i].gravity
    totalStability += field[i].stability
  }

  const avgGravity = totalGravity / field.length
  const avgStability = totalStability / field.length

  return {
    pulse: clamp(0.8 + avgGravity * 1.2, 0.8, 2.0),
    colorShift: clamp(avgGravity * (1 - avgStability * 0.3), 0, 1),
    surfaceIntensity: clamp(avgGravity, 0, 1.5),
  }
}

export function computeSceneModulation(orbState: OrbState): SceneModulation {
  return {
    exposure: clamp(1 + orbState.colorShift * 0.35, 0.8, 1.6),
    bloom: clamp(1 + orbState.surfaceIntensity * 0.6, 0.9, 1.8),
    fogDensity: clamp(0.1 + orbState.colorShift * 0.12, 0.08, 0.3),
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
    sceneModulation,
  }
}