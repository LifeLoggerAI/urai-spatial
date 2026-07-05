import { createMindRenderer } from "./cognitiveBridge.render";

export type XRFrame = {
  nodes: any[];
  timestamp: number;
};

// XR binding layer (WebXR / Three.js / spatial UI hook)
export function createXRWorld(userId: string = "demo-user") {
  const renderer = createMindRenderer(userId);

  let subscribers: Array<(frame: XRFrame) => void> = [];
  let running = false;
  let interval: any = null;

  function mapToXR() {
    const frame = renderer.map();

    return {
      nodes: frame.nodes.map((n) => ({
        id: n.id,
        position: { x: n.x, y: n.y, z: n.z },
        type: n.type,
        intensity: n.intensity,
        scale: Math.max(0.5, n.intensity)
      })),
      timestamp: Date.now()
    };
  }

  function emit(frame: XRFrame) {
    for (const s of subscribers) {
      try {
        s(frame);
      } catch {}
    }
  }

  function subscribe(cb: (frame: XRFrame) => void) {
    subscribers.push(cb);
    return () => {
      const i = subscribers.indexOf(cb);
      if (i >= 0) subscribers.splice(i, 1);
    };
  }

  function start(fps: number = 2) {
    if (running) return stop;
    running = true;

    renderer.start(fps);

    interval = setInterval(() => {
      const xrFrame = mapToXR();
      emit(xrFrame);
    }, 1000 / fps);

    return stop;
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
    running = false;
  }

  return {
    renderer,
    mapToXR,
    subscribe,
    start,
    stop
  };
}
