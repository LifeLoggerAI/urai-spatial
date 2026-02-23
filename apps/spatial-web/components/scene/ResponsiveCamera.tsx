
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function ResponsiveCamera() {
  const { camera } = useThree();

  useEffect(() => {
    // URAI V1 Cinematic Composition Lock
    // This establishes the correct visual hierarchy: Sky -> Orb -> Ground.
    camera.position.set(0, 2.75, 6);
    camera.lookAt(0, 0.7, 0);

    // Registering the camera to the window for debugging.
    ;(window as any).__r3fCamera = camera
  }, [camera]);

  return null;
}
