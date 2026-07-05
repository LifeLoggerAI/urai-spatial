import { createCognitiveKernel } from "./cognitiveBridge.core";
import { createCognitiveStream } from "./cognitiveBridge.stream";
import { createReasoningEngine } from "./cognitiveBridge.reasoning";
import { createActionLayer } from "./cognitiveBridge.action";
import { createSpatialEngine } from "./cognitiveBridge.spatial";
import { createMindRenderer } from "./cognitiveBridge.render";
import { createXRWorld } from "./cognitiveBridge.xr";

export type CognitiveSystem = {
  kernel: any;
  stream: any;
  reasoning: any;
  action: any;
  spatial: any;
  render: any;
  xr: any;
};

export function createCognitiveSystem(userId: string = "demo-user"): CognitiveSystem {
  const kernel = createCognitiveKernel(userId);
  const stream = createCognitiveStream(userId);
  const reasoning = createReasoningEngine(userId);
  const action = createActionLayer(userId);
  const spatial = createSpatialEngine(userId);
  const render = createMindRenderer(userId);
  const xr = createXRWorld(userId);

  stream.subscribe((state: any) => {
    try {
      reasoning.reason();
      action.act();
      spatial.syncFromKernel?.();
      render.map?.();
      xr.mapToXR?.();
    } catch {}
  });

  function start() {
    stream.start?.(500);
    reasoning.start?.(1000);
    action.start?.(1500);
    spatial.start?.(1000);
    render.start?.(2);
    xr.start?.(2);
  }

  function stop() {
    stream.stop?.();
    reasoning.stop?.();
    action.stop?.();
    spatial.stop?.();
    render.stop?.();
    xr.stop?.();
  }

  return {
    kernel,
    stream,
    reasoning,
    action,
    spatial,
    render,
    xr
  };
}
