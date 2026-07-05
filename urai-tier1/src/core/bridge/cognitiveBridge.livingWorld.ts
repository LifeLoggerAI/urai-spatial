import { createConsciousXR } from "./cognitiveBridge.consciousness.xr";
import { createEvolutionEngine } from "./cognitiveBridge.evolution";
import { createMemoryGraph } from "./cognitiveBridge.memoryGraph";
import { createSpatialEngine } from "./cognitiveBridge.spatial";
import { createMindRenderer } from "./cognitiveBridge.render";

export type LivingWorldState = {
  tick: number;
  nodes: any[];
  metrics: any;
};

// Living World = closed-loop cognition + spatial + evolution + XR feedback system
export function createLivingWorld(userId: string = "demo-user") {
  const xr = createConsciousXR(userId);
  const evo = createEvolutionEngine(userId);
  const graph = createMemoryGraph(userId);
  const spatial = createSpatialEngine(userId);
  const render = createMindRenderer(userId);

  let tick = 0;
  let running = false;
  let interval: any = null;

  function step() {
    tick++;

    // 1. Evolve system state
    const metrics = evo.step();

    // 2. Sync memory graph
    const g = graph.syncFromKernel();

    // 3. Spatial mapping refresh
    spatial.syncFromKernel();

    // 4. Render frame update
    const frame = render.map();

    // 5. XR feedback loop (passive observation)
    const xrFrame = frame;

    return {
      tick,
      nodes: g.nodes,
      metrics,
      xrFrame
    };
  }

  function start(fps: number = 2) {
    if (running) return stop;
    running = true;

    xr.start(fps);
    evo.start?.(2000);
    spatial.start(1000);
    render.start(fps);

    interval = setInterval(() => {
      step();
    }, 1000 / fps);

    return stop;
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
  }

  function getState(): LivingWorldState {
    return {
      tick,
      nodes: graph.getGraph().nodes,
      metrics: evo.analyze()
    };
  }

  return {
    xr,
    evo,
    graph,
    spatial,
    render,
    step,
    start,
    stop,
    getState
  };
}
