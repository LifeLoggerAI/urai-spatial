import { emit } from '../events/eventBus';

export function insightWorker(memory: any) {
  const text = memory?.content || '';
  const lower = text.toLowerCase();

  let message: string | null = null;
  let confidence = 0.5;

  if (lower.includes('stress') || lower.includes('tired')) {
    message = 'Possible stress pattern detected';
    confidence = 0.7;
  } else if (lower.includes('idea') || lower.includes('build')) {
    message = 'Creative / execution-oriented signal detected';
    confidence = 0.6;
  }

  if (!message) return null;

  const insight = {
    id: String(Date.now()),
    memoryId: memory.id,
    message,
    confidence,
    timestamp: Date.now()
  };

  emit({
    type: 'insight.created',
    payload: insight,
    timestamp: insight.timestamp
  });

  return insight;
}