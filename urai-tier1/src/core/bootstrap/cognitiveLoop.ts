import { subscribe } from '../events/eventBus';

export type CognitiveMemory = {
  id?: string;
  content?: unknown;
  [key: string]: unknown;
};

export type CognitiveInsight = {
  id?: string;
  message?: unknown;
  [key: string]: unknown;
};

let latestMemory: CognitiveMemory | null = null;
let latestInsight: CognitiveInsight | null = null;

export function initCognitiveLoop() {
  subscribe((event) => {
    switch (event.type) {
      case 'memory.created':
        latestMemory = event.payload as CognitiveMemory;
        break;

      case 'insight.created':
        latestInsight = event.payload as CognitiveInsight;
        break;
    }
  });

  return {
    getLatestMemory: () => latestMemory,
    getLatestInsight: () => latestInsight
  };
}
