import { initCognitiveLoop } from "../bootstrap/cognitiveLoop";
import { processMemory } from "../pipeline/processMemory";

export type CognitiveState = {
  memory: any;
  insight: any;
};

export function createCognitiveKernel(userId: string = "demo-user") {
  const cognitive = initCognitiveLoop();

  function getMemory() {
    return cognitive.getLatestMemory?.() ?? null;
  }

  function getInsight() {
    return cognitive.getLatestInsight?.() ?? null;
  }

  function send(input: string) {
    if (!input || !input.trim()) return null;
    return processMemory(userId, input);
  }

  return {
    cognitive,
    getMemory,
    getInsight,
    send
  };
}