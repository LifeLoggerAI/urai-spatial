import { createLivingWorld } from "./cognitiveBridge.livingWorld";
import { createEvolutionEngine } from "./cognitiveBridge.evolution";

export type UniverseState = {
  tick: number;
  worlds: number;
  metrics: any;
};

// Multi-world universe orchestrator (scales Living World into many instances)
export function createCognitiveUniverse(userId: string = "demo-user") {
  const worlds: ReturnType<typeof createLivingWorld>[] = [];
  const evo = createEvolutionEngine(userId);

  let tick = 0;
  let running = false;
  let interval: any = null;

  function spawnWorld() {
    const world = createLivingWorld(userId);
    worlds.push(world);
    world.start?.(2);
    return world;
  }

  function step() {
    tick++;

    // evolve universe-level meta state
    const metrics = evo.analyze?.() ?? { memoryGrowth: 0, edgeDensity: 0 };

    // adaptive scaling rule
    if (tick % 5 === 0 && worlds.length < 3) {
      spawnWorld();
    }

    if (metrics.edgeDensity < 0.3 && worlds.length > 1) {
      worlds.pop()?.stop?.();
    }

    return {
      tick,
      worlds: worlds.length,
      metrics
    };
  }

  function start(fps: number = 2) {
    if (running) return stop;
    running = true;

    spawnWorld();

    interval = setInterval(() => {
      step();
    }, 1000 / fps);

    return stop;
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;

    worlds.forEach(w => w.stop?.());
  }

  function getState(): UniverseState {
    return {
      tick,
      worlds: worlds.length,
      metrics: evo.analyze?.()
    };
  }

  return {
    worlds,
    spawnWorld,
    step,
    start,
    stop,
    getState
  };
}
