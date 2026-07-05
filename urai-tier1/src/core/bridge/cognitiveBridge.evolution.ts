import { createMemoryGraph } from "./cognitiveBridge.memoryGraph";
import { createReasoningEngine } from "./cognitiveBridge.reasoning";
import { createCognitiveKernel } from "./cognitiveBridge.core";

export type EvolutionMetrics = {
  memoryGrowth: number;
  edgeDensity: number;
  reasoningLoad: number;
};

// Self-evolving adaptation layer (meta-controller)
export function createEvolutionEngine(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);
  const reasoning = createReasoningEngine(userId);
  const graph = createMemoryGraph(userId);

  let adaptationInterval: any = null;
  let running = false;

  function analyze(): EvolutionMetrics {
    const g = graph.getGraph();

    const memoryNodes = g.nodes.filter(n => n.type === "memory").length;
    const insightNodes = g.nodes.filter(n => n.type === "insight").length;

    const edgeDensity = g.nodes.length > 0 ? g.edges.length / g.nodes.length : 0;

    return {
      memoryGrowth: memoryNodes + insightNodes,
      edgeDensity,
      reasoningLoad: reasoning.reason().length
    };
  }

  function adapt(metrics: EvolutionMetrics) {
    // Adaptive rule injection based on system state

    if (metrics.edgeDensity < 0.5) {
      reasoning.addRule({
        id: "strengthen-association",
        evaluate: (state) => {
          if (state.memory && state.insight) {
            return "reinforce-memory-association";
          }
          return null;
        }
      });
    }

    if (metrics.memoryGrowth > 10) {
      reasoning.addRule({
        id: "compress-memory",
        evaluate: () => "optimize-memory-structure"
      });
    }

    if (metrics.reasoningLoad > 5) {
      reasoning.addRule({
        id: "stabilize-reasoning",
        evaluate: () => "reduce-reasoning-noise"
      });
    }
  }

  function step() {
    const metrics = analyze();
    adapt(metrics);

    // feed evolution back into memory graph
    graph.addNode({
      id: "evo-" + Date.now(),
      content: metrics,
      timestamp: Date.now(),
      type: "reasoning"
    });

    return metrics;
  }

  function start(intervalMs: number = 2000) {
    if (running) return stop;
    running = true;

    adaptationInterval = setInterval(() => {
      step();
    }, intervalMs);

    return stop;
  }

  function stop() {
    if (adaptationInterval) clearInterval(adaptationInterval);
    adaptationInterval = null;
    running = false;
  }

  return {
    kernel,
    reasoning,
    graph,
    analyze,
    adapt,
    step,
    start,
    stop
  };
}
