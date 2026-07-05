import { createXRWorld } from "./cognitiveBridge.xr";
import { createMemoryGraph } from "./cognitiveBridge.memoryGraph";
import { createEvolutionEngine } from "./cognitiveBridge.evolution";

export type ConsciousXRState = {
  xrNodes: any[];
  feedbackEvents: any[];
};

// Consciousness layer (XR feedback loop + self-model update)
export function createConsciousXR(userId: string = "demo-user") {
  const xr = createXRWorld(userId);
  const graph = createMemoryGraph(userId);
  const evo = createEvolutionEngine(userId);

  const feedbackEvents: any[] = [];
  let running = false;

  function interpretXRFrame(frame: any) {
    // Convert XR perception back into cognitive signals
    const signals = frame.nodes.map((n: any) => ({
      id: n.id,
      type: "xr-observation",
      content: {
        position: n.position,
        intensity: n.intensity
      },
      timestamp: Date.now()
    }));

    return signals;
  }

  function feedBackToCognition(signals: any[]) {
    for (const s of signals) {
      graph.addNode({
        id: s.id,
        content: s.content,
        timestamp: Date.now(),
        type: "reasoning"
      });

      feedbackEvents.push(s);
    }
  }

  function step(frame: any) {
    const signals = interpretXRFrame(frame);
    feedBackToCognition(signals);

    // Evolution reacts to XR feedback
    evo.step?.();

    return {
      signals,
      feedbackEvents
    };
  }

  function start(fps: number = 2) {
    if (running) return stop;
    running = true;

    xr.subscribe((frame: any) => {
      step(frame);
    });

    xr.start(fps);
    evo.start?.(2000);

    return stop;
  }

  function stop() {
    running = false;
  }

  return {
    xr,
    graph,
    evo,
    step,
    start,
    feedbackEvents
  };
}
