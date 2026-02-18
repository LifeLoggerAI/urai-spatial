
import { Canvas } from '@react-three/fiber';

import { Suspense } from 'react';
import { UraiSpatialScene } from './UraiSpatialScene';
import { useMachine } from '@xstate/react';
import viewerMachine from './fsm';

export const URAI_SPATIAL_SCENE_ASSET_PATH = '/';

// Mock scene loading and transition functions
const loadScenes = async () => {
  // In a real application, you would fetch scene data from a server
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return ['scene_starworld_v1', 'scene_memoryroom_v1'];
};

const transitionToScene = async (context, event) => {
  // In a real application, you would handle the transition between scenes
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return event.sceneName;
};

function App() {
  const [state, send] = useMachine(viewerMachine, {
    services: {
      loadScenes: loadScenes,
      transitionToScene: transitionToScene,
    },
  });

  return (
    <>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, color: 'white' }}>
        <h1>Current State: {JSON.stringify(state.value)}</h1>
        {state.matches('idle') && (
          <button onClick={() => send('LOAD_SCENES')}>Load Scenes</button>
        )}
        {state.matches('ready') && (
          <div>
            <h2>Scenes:</h2>
            <ul>
              {state.context.scenes.map((sceneName) => (
                <li key={sceneName}>
                  <button
                    onClick={() =>
                      send({ type: 'TRANSITION_TO_SCENE', sceneName })
                    }
                  >
                    {sceneName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {state.matches('error') && (
          <div>
            <h2>Error: {state.context.error}</h2>
            <button onClick={() => send('RETRY')}>Retry</button>
          </div>
        )}
      </div>
      
      <Canvas>
        
          <Suspense fallback={null}>
            {state.context.currentScene && (
              <UraiSpatialScene sceneName={state.context.currentScene} />
            )}
          </Suspense>
        
      </Canvas>
    </>
  );
}

export default App;
