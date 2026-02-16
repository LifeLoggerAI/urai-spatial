
import { Canvas } from '@react-three/fiber';
import { VRButton, XR } from '@react-three/xr';
import { SceneEngine } from '../engine/SceneEngine';
import { LifeMap } from '../components/Life-Map';

export default function HomePage() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <VRButton />
      <Canvas>
        <XR>
          <SceneEngine>
            <LifeMap />
          </SceneEngine>
        </XR>
      </Canvas>
    </div>
  );
}
