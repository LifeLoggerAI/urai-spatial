import { initCognitiveLoop } from "../bootstrap/cognitiveLoop";
import { processMemory } from "../pipeline/processMemory";

export function createCognitiveBridge(userId: string = "demo-user") {
  const cognitive = initCognitiveLoop();

  let autonomousInterval: any = null;
  let isAutonomousRunning = false;
  let isProcessingTick = false;

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

  // AUTONOMOUS LOOP (LEVELLED UP + GUARDED)
  function startAutonomousLoop(intervalMs: number = 2000) {
    if (isAutonomousRunning) return stopAutonomousLoop;

    isAutonomousRunning = true;

    autonomousInterval = setInterval(() => {
      if (isProcessingTick) return;
      isProcessingTick = true;

      try {
        const mem = getMemory();
        const insight = getInsight();

        // prevent empty churn
        if (!mem && !insight) return;

        const text = mem?.content || insight?.message;
        if (!text) return;

        // guard against self-trigger storm
        if (text.includes("autonomous reflection")) return;

        processMemory(userId, "autonomous reflection: " + text);
      } finally {
        isProcessingTick = false;
      }
    }, intervalMs);

    return stopAutonomousLoop;
  }

  function stopAutonomousLoop() {
    if (autonomousInterval) {
      clearInterval(autonomousInterval);
      autonomousInterval = null;
    }
    isAutonomousRunning = false;
    isProcessingTick = false;
  }

  return {
    cognitive,
    getMemory,
    getInsight,
    send,
    subscribe,
    startAutonomousLoop,
    stopAutonomousLoop
  };
}
