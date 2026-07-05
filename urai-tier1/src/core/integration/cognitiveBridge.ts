import { initCognitiveLoop } from "../bootstrap/cognitiveLoop";
import { processMemory } from "../pipeline/processMemory";

export function createCognitiveBridge(userId: string = "demo-user") {
  const cognitive = initCognitiveLoop();

  function getMemory() {
    return cognitive.getLatestMemory?.() ?? null;
  }

  function getInsight() {
    return cognitive.getLatestInsight?.() ?? null;
  }

  function send(input: string) {
    if (!input || !input.trim()) return;
    return processMemory(userId, input);
  }

  // REAL-TIME SUBSCRIPTION LAYER
  function subscribe(callback: (state: { memory: any; insight: any }) => void) {
    const interval = setInterval(() => {
      callback({
        memory: getMemory(),
        insight: getInsight()
      });
    }, 500);

    return () => clearInterval(interval);
  }

  // AUTONOMOUS LOOP (SAFE REFLECTION MODE)
  function startAutonomousLoop(intervalMs: number = 2000) {
    const id = setInterval(() => {
      const mem = getMemory();
      const insight = getInsight();

      // prevent runaway self-triggering
      if (!mem && !insight) return;

      // only reflect if system is idle-ish
      const text = mem?.content || insight?.message;
      if (!text) return;

      processMemory(userId, "autonomous reflection: " + text);
    }, intervalMs);

    return () => clearInterval(id);
  }

  return {
    cognitive,
    getMemory,
    getInsight,
    send,
    subscribe,
    startAutonomousLoop
  };
}
