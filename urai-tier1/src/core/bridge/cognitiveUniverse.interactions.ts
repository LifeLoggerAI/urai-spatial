import { createLivingWorld } from "./cognitiveBridge.livingWorld";

export type WorldMessage = {
  from: number;
  to: number;
  type: "sync" | "mutation" | "echo";
  payload: any;
  timestamp: number;
};

export type InteractionField = {
  density: number;
  messages: WorldMessage[];
};

// Cross-world interaction layer (enables communication + coupling between worlds)
export function createUniverseInteractions(userId: string = "demo-user") {
  const worlds: ReturnType<typeof createLivingWorld>[] = [];
  const messages: WorldMessage[] = [];

  let tick = 0;
  let running = false;
  let interval: any = null;

  function registerWorld(world: ReturnType<typeof createLivingWorld>) {
    worlds.push(world);
    return world;
  }

  function computeSimilarity(a: any, b: any) {
    // lightweight heuristic coupling (memory + metric overlap)
    const ma = a?.metrics?.memoryGrowth ?? 0;
    const mb = b?.metrics?.memoryGrowth ?? 0;
    const da = a?.metrics?.edgeDensity ?? 0;
    const db = b?.metrics?.edgeDensity ?? 0;

    return 1 - Math.abs(ma - mb) / 100 - Math.abs(da - db);
  }

  function broadcast(fromIndex: number, payload: any, type: WorldMessage["type"] = "sync") {
    worlds.forEach((_, i) => {
      if (i === fromIndex) return;

      messages.push({
        from: fromIndex,
        to: i,
        type,
        payload,
        timestamp: Date.now()
      });
    });
  }

  function step() {
    tick++;

    if (worlds.length < 2) return { tick, density: 0 };

    // 1. compute cross-world coupling
    for (let i = 0; i < worlds.length; i++) {
      for (let j = i + 1; j < worlds.length; j++) {
        const wi = worlds[i].getState?.();
        const wj = worlds[j].getState?.();

        const similarity = computeSimilarity(wi, wj);

        // 2. if worlds diverge, send mutation signal
        if (similarity < 0.4) {
          broadcast(i, { similarity, target: j }, "mutation");
          broadcast(j, { similarity, target: i }, "mutation");
        }

        // 3. if worlds converge, echo state
        if (similarity > 0.8) {
          broadcast(i, { similarity, snapshot: wi }, "echo");
        }
      }
    }

    const density = messages.length / Math.max(1, worlds.length);

    return {
      tick,
      density,
      messages: messages.slice(-50)
    };
  }

  function start(intervalMs: number = 2000) {
    if (running) return stop;
    running = true;

    interval = setInterval(() => {
      step();
    }, intervalMs);

    return stop;
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
  }

  function getField(): InteractionField {
    return {
      density: messages.length / Math.max(1, worlds.length),
      messages
    };
  }

  return {
    worlds,
    registerWorld,
    broadcast,
    step,
    start,
    stop,
    getField
  };
}
