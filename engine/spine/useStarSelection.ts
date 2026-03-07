
import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "@/engine/state/spatialStore"
import { useCameraStore } from "@/engine/state/cameraStore";

export default function useStarSelection(stars, setSelected) {
  const { camera, gl, scene } = useThree()
  const { spatialMode } = useSpatialStore();
  const { isGliding } = useCameraStore();

  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function onClick(event) {
      // Invariant: Selection is disabled if the camera is gliding or if not in lifemap mode.
      if (isGliding || spatialMode !== 'lifemap') return;

      const rect = gl.domElement.getBoundingClientRect()

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const intersects = raycaster.intersectObjects(stars)

      if (intersects.length > 0) {
        setSelected(intersects[0].object.userData.starId)
      }
    }

    gl.domElement.addEventListener("click", onClick)
    return () => gl.domElement.removeEventListener("click", onClick)
  }, [camera, gl, scene, spatialMode, isGliding])
}
