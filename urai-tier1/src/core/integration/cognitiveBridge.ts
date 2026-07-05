import { initCognitiveLoop } from "../bootstrap/cognitiveLoop";
import { processMemory } from "../pipeline/processMemory";

export function createCognitiveBridge(userId: string = "demo-user") {
  const cognitive = initCognitiveLoop();

  let autonomousInterval: any = null;
  let isAutonomousRunning = false;
  let isProcessingTick = false;

  // event subscribers (real-time evolution layer)
  const listeners: Array<(state: { memory: any; insight: any }) => void> = [];

  // multi-agent cognition layer
  const agents: Array<{
    id: string;
    policy: (state: { memory: any; insight: any }) => string | null;
  }> = [];

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

  function emit() {
    const state = {
      memory: getMemory(),
      insight: getInsight()
    };

    // notify UI subscribers
    for (const l of listeners) {
      try {
        l(state);
      } catch {}
    }

    return state;
  }

  function onUpdate(cb: (state: { memory: any; insight: any }) => void) {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function registerAgent(agent: {
    id: string;
    policy: (state: { memory: any; insight: any }) => string | null;
  }) {
    agents.push(agent);
  }

  // AUTONOMOUS EVOLUTION LOOP (MULTI-AGENT)
  function startAutonomousLoop(intervalMs: number = 2000) {
    if (isAutonomousRunning) return stopAutonomousLoop;

    isAutonomousRunning = true;

    autonomousInterval = setInterval(() => {
      if (isProcessingTick) return;
      isProcessingTick = true;

      try {
        const state = emit();
        const mem = state.memory;
        const insight = state.insight;

        if (!mem && !insight) return;

        const baseText = mem?.content || insight?.message;
        if (!baseText) return;

        // core autonomous reflection
        if (!baseText.includes("autonomous reflection")) {
          processMemory(userId, "autonomous reflection: " + baseText);
        }

        // multi-agent evolution step
        for (const agent of agents) {
          try {
            const result = agent.policy(state);
            if (result && result.trim()) {
              processMemory(userId, `[agent:${agent.id}] ${result}`);
            }
          } catch {}
        }
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

  // backward compatible subscription (now event-driven)
  function subscribe(callback: (state: { memory: any; insight: any }) => void) {
    return onUpdate(callback);
  }

  return {
    cognitive,
    getMemory,
    getInsight,
    send,
    subscribe,
    onUpdate,
    registerAgent,
    startAutonomousLoop,
    stopAutonomousLoop
  };
}
