
import { useMemo } from 'react';
import { useTimeline } from './TimeProvider';
import { runEmotionalTimeEngine } from './engine';

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

/**
 * The main hook for the Emotional Time Core.
 * It subscribes to the global timeline, runs the physics engine, and provides the final, emotionally-calibrated state for the scene.
 * @param nodes The raw array of memory nodes from your data source (e.g., Firestore).
 * @returns The complete, calculated state of the universe for the current frame.
 */
export const useEmotionalTimeEngine = (nodes: MemoryNode[]) => {
  const { time } = useTimeline();

  // useMemo ensures the heavy physics calculations only run when time or data changes.
  const engineState = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      // Return a default, empty state if there are no nodes.
      return {
        nodes: [],
        orbState: { pulse: 0.8, colorShift: 0, surfaceIntensity: 0 },
        sceneModulation: { exposure: 1, bloom: 1, fogDensity: 0.1 },
      };
    }
    return runEmotionalTimeEngine(nodes, time);
  }, [nodes, time]);

  return engineState;
};
