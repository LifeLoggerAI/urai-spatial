import { subscribe } from '../events/eventBus';

let latestMemory = null;
let latestInsight = null;

export function initCognitiveLoop() {
  subscribe((event) => {
    switch (event.type) {
      case 'memory.created':
        latestMemory = event.payload;
        break;

      case 'insight.created':
        latestInsight = event.payload;
        break;
    }
  });

  return {
    getLatestMemory: () => latestMemory,
    getLatestInsight: () => latestInsight
  };
}