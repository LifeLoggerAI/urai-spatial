import React from 'react';
import { Canvas } from '@react-three/fiber';
import { VRButton, ARButton, XR, Controllers, Hands } from '@react-three/xr';
import Scene from './Scene';

function App() {
  return (
    <>
      <VRButton />
      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          <Scene />
        </XR>
      </Canvas>
    </>
  );
}

export default App;
