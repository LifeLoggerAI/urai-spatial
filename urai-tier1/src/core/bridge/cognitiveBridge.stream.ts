import { createCognitiveKernel } from "./cognitiveBridge.core";

export type CognitiveState = {
  memory: any;
  insight: any;
};

export function createCognitiveStream(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);

  const listeners: Array<(state: CognitiveState) => void> = [];
  let interval: any = null;
  let running = false;

  function getState(): CognitiveState {
    return {
      memory: kernel.getMemory(),
      insight: kernel.getInsight()
    };
  }

  function emit() {
    const state = getState();
    for (const l of listeners) {
      try {
        l(state);
      } catch {}
    }
    return state;
  }

  function subscribe(cb: (state: CognitiveState) => void) {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function start(intervalMs: number = 500) {
    if (running) return stop;
    running = true;

    interval = setInterval(() => {
      emit();
    }, intervalMs);

    return stop;
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
    running = false;
  }

  return {
    ...kernel,
    getState,
    emit,
    subscribe,
    start,
    stop
  };
}
