
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useWarpController } from "@/hooks/useWarpController";
import { useLifeMapData } from "@/hooks/useLifeMapData";

export function CameraController() {
  const { camera } = useThree();
  const { warpState, activeMemory } = useWarpController();
  const { memories } = useLifeMapData();

  const targetLookAt = new Vector3();

  useFrame((state, delta) => {
    if (warpState === "FOCUSING" && activeMemory) {
      const memory = memories.find(m => m.id === activeMemory);
      if (memory) {
        const starPosition = new Vector3(memory.position.x, memory.position.y, memory.position.z);
        const targetPosition = new Vector3(memory.position.x, memory.position.y, memory.position.z + 10);
        
        camera.position.lerp(targetPosition, 0.06);
        
        targetLookAt.lerp(starPosition, 0.1);
        camera.lookAt(targetLookAt);
      }
    }

    if (warpState === "WARPING") {
      // This is a simple forward motion. We can get more creative here later.
      camera.translateZ(-delta * 150);
    }
  });

  return null;
}
