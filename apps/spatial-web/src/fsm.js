
import { createMachine, assign } from 'xstate';

const viewerMachine = createMachine({
  id: 'viewer',
  initial: 'idle',
  context: {
    scenes: [],
    currentScene: null,
    error: null,
  },
  states: {
    idle: {
      on: {
        LOAD_SCENES: 'loading',
      },
    },
    loading: {
      invoke: {
        id: 'sceneLoader',
        src: 'loadScenes',
        onDone: {
          target: 'ready',
          actions: assign({ scenes: (context, event) => event.data }),
        },
        onError: {
          target: 'error',
          actions: assign({ error: (context, event) => event.data }),
        },
      },
    },
    ready: {
      on: {
        TRANSITION_TO_SCENE: 'transitioning',
      },
    },
    transitioning: {
      invoke: {
        id: 'sceneTransition',
        src: 'transitionToScene',
        onDone: {
          target: 'ready',
          actions: assign({ currentScene: (context, event) => event.data }),
        },
        onError: {
          target: 'error',
          actions: assign({ error: (context, event) => event.data }),
        },
      },
    },
    error: {
      on: {
        RETRY: 'loading',
      },
    },
  },
});

export default viewerMachine;
