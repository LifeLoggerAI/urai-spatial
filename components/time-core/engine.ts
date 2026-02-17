
// This file contains the pure, deterministic physics and modulation logic for the Emotional Time Core.

// A comprehensive type for a memory node, based on the system architecture.
type MemoryNode = {
  id: string;
  timestamp: number;
  emotionalWeight: number;
  stability: number;
  x: number;
  y: number;
  z: number;
};

type EmotionalFieldEntry = {
  id: string;
  gravity: number;
  dilation: number;
  stability: number;
  x: number;
  y: number;
  z: number;
};

export type OrbState = {
  pulse: number;
  colorShift: number;
  surfaceIntensity: number;
};

export type SceneModulation = {
  exposure: number;
  bloom: number;
  fogDensity: number;
};

// Helper function for gravity calculation
const distance = (nodeA: {x:number, y:number, z:number}, nodeB: {x:number, y:number, z:number}) => {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    const dz = nodeA.z - nodeB.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};


// 1. Emotional Field Generator
function buildEmotionalField(nodes: MemoryNode[], time: number): EmotionalFieldEntry[] {
  return nodes.map(node => {
    const age = time - node.timestamp;
    const recencyFactor = Math.exp(-age * 0.00000001);

    return {
      id: node.id,
      gravity: node.emotionalWeight * recencyFactor,
      dilation: 1 + node.emotionalWeight * 1.5,
      stability: node.stability,
      x: node.x,
      y: node.y,
      z: node.z,
    };
  });
}

// 2. Gravity Map
function applyGravity(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
    return nodes.map(node => {
        let dx = 0;
        let dy = 0;
        let dz = 0;

        field.forEach(f => {
            if (f.id === node.id) return;

            const dist = distance(node, f);
            const force = f.gravity / ((dist * dist) + 0.1); // Add epsilon to prevent division by zero

            // Force is attractive, pulling the node towards the field entry f
            dx += (f.x - node.x) * force;
            dy += (f.y - node.y) * force;
            dz += (f.z - node.z) * force;
        });

        return {
            ...node,
            x: node.x + dx * 0.01,
            y: node.y + dy * 0.01,
            z: node.z + dz * 0.01,
        };
    });
}

// 3. Emotional Time Dilation
function applyDilation(nodes: MemoryNode[], field: EmotionalFieldEntry[]): MemoryNode[] {
    return nodes.map(node => {
        const fieldEntry = field.find(f => f.id === node.id);
        if (!fieldEntry) return node;

        const dilationFactor = fieldEntry.dilation;
        return {
            ...node,
            x: node.x * dilationFactor,
            y: node.y, // As per spec, y is not dilated
            z: node.z * dilationFactor,
        };
    });
}

// 4. Orb and Scene Integrators
export function computeOrbState(field: EmotionalFieldEntry[]): OrbState {
    if (field.length === 0) {
        return { pulse: 0.8, colorShift: 0, surfaceIntensity: 0 };
    }
    const totalGravity = field.reduce((sum, f) => sum + f.gravity, 0);
    const avgGravity = totalGravity / field.length;

    return {
        pulse: 0.8 + avgGravity * 1.5,
        colorShift: avgGravity,
        surfaceIntensity: avgGravity,
    };
}

export function computeSceneModulation(orbState: OrbState): SceneModulation {
    return {
        exposure: 1 + orbState.colorShift * 0.5,
        bloom: 1 + orbState.surfaceIntensity,
        fogDensity: 0.1 + orbState.colorShift * 0.2,
    };
}

// Master orchestrator function
export function runEmotionalTimeEngine(nodes: MemoryNode[], time: number) {
    const emotionalField = buildEmotionalField(nodes, time);
    const gravityAppliedNodes = applyGravity(nodes, emotionalField);
    const finalNodePositions = applyDilation(gravityAppliedNodes, emotionalField);

    const orbState = computeOrbState(emotionalField);
    const sceneModulation = computeSceneModulation(orbState);

    return {
        nodes: finalNodePositions,
        orbState,
        sceneModulation,
    };
}
