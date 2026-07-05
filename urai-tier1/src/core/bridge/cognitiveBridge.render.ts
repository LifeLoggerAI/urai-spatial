import { createSpatialEngine } from "./cognitiveBridge.spatial";

export type RenderNode = {
  id: string;
  x: number;
  y: number;
  z: number;
  type: string;
  intensity: number;
};

export type RenderFrame = {
  nodes: RenderNode[];
};

// Lightweight "mind renderer" abstraction (UI/Three.js/WebXR can hook into this)
export function createMindRenderer(userId: string = "demo-user") {
  const spatial = createSpatialEngine(userId);

  let subscribers: Array<(frame: RenderFrame) => void> = [];
  let interval: any = null;
  let running = false;

  function map(): RenderFrame {
    const state = spatial.getSpatialState();

    const nodes: RenderNode[] = state.nodes.map((n: any) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      z: n.z,
      type: n.type,
      intensity: n.intensity
    }));

    return { nodes };
  }

  function subscribe(cb: (frame: RenderFrame) => void) {
    subscribers.push(cb);
    return () => {
      const i = subscribers.indexOf(cb);
      if (i >= 0) subscribers.splice(i, 1);
    };
  }

  function emit(frame: RenderFrame) {
    for (const s of subscribers) {
      try {
        s(frame);
      } catch {}
    }
  }

  function start(fps: number = 2) {
    if (running) return stop;
    running = true;

    spatial.start(1000);

    interval = setInterval(() => {
      const frame = map();
      emit(frame);
    }, 1000 / fps);

    return stop;
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
    running = false;
  }

  return {
    spatial,
    map,
    subscribe,
    start,
    stop
  };
}
