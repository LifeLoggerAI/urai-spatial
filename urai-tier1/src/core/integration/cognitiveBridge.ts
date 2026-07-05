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

  return {
    cognitive,
    getMemory,
    getInsight,
    send
  };
}
