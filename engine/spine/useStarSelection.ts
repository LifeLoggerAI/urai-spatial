import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

export default function useStarSelection(stars, setSelected) {
  const { camera, gl, scene } = useThree()

  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function onClick(event) {
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
  }, [camera, gl, scene])
}
