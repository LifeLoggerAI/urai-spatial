type EventPayload = {
  type: string;
  payload?: any;
  timestamp: number;
};

type Listener = (event: EventPayload) => void;

const listeners: Listener[] = [];

export function emit(event: EventPayload) {
  const normalized = {
    ...event,
    timestamp: event.timestamp ?? Date.now()
  };

  for (const listener of listeners) {
    try {
      listener(normalized);
    } catch (err) {
      console.error('[EventBus] listener error:', err);
    }
  }
}

export function subscribe(listener: Listener) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

export function clearListeners() {
  listeners.length = 0;
}