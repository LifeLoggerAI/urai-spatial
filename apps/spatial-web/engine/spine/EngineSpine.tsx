
import { Canvas } from '@react-three/fiber'
import SceneManager from './SceneManager'
import CameraController from '../systems/CameraController'
import LightingSystem from '../systems/LightingSystem'
import EmotionalBiomeSystem from '../systems/EmotionalBiomeSystem'

export default function EngineSpine() {
  return (
    <Canvas>
      <CameraController />
      <LightingSystem />
      <EmotionalBiomeSystem />
      <SceneManager />
    </Canvas>
  )
}
