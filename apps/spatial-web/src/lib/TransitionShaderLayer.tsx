'use client';

import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, BrightnessContrast } from "@react-three/postprocessing";
import { useSpatialCamera } from '@/components/spatial/SpatialCameraController';
import { SpatialTransitionState } from '@/packages/spatial-core/src/fsm/SpatialTransitionFSM';

/**
 * This component provides the "Transition Shader Layer" as defined in the architectural blueprint.
 * It applies a stack of post-processing effects that can be modulated by the state of the FSM.
 * This is what makes the transition feel physical and hides any potential micro-jitter.
 *
 * @see SPATIAL_LOCK.md
 */
export function TransitionShaderLayer() {
  const { fsm } = useSpatialCamera();

  // In a real implementation, these values would be driven by the FSM state.
  // For example, intensity and aberration would ramp up during the COMMITTING state.
  const isTransitioning = fsm.state === SpatialTransitionState.COMMITTING || fsm.state === SpatialTransitionState.TRANSITIONING;

  return (
    <EffectComposer>
      <Bloom intensity={1.6} luminanceThreshold={0.85} luminanceSmoothing={0.7} />
      <BrightnessContrast brightness={0.01} contrast={0.12} />
      <ChromaticAberration offset={isTransitioning ? [0.001, 0.001] : [0.0005, 0.0005]} />
      <Noise opacity={0.035} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </EffectComposer>
  );
}
