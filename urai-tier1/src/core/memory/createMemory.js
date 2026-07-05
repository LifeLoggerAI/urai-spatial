import { emit } from '../events/eventBus';

export function createMemory(userId, content) {
  const memory = {
    id: String(Date.now()),
    userId,
    content,
    timestamp: Date.now()
  };

  emit({
    type: 'memory.created',
    payload: memory,
    timestamp: memory.timestamp
  });

  return memory;
}