import { createMemory } from '../memory/createMemory';
import { insightWorker } from '../workers/insightWorker';

export function processMemory(userId, content) {
  const memory = createMemory(userId, content);
  const insight = insightWorker(memory);

  return {
    memory,
    insight
  };
}