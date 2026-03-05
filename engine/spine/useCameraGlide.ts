import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const target = new THREE.Vector3()
const desired = new THREE.Vector3()

export default function useCameraGlide(camera: THREE.Camera){

  const selectedStarId = useSpatialStore(s=>s.selectedStarId)
  const starPositions = useSpatialStore(s=>s.starPositions)

  useFrame(()=>{

    if(selectedStarId === null) return

    const p = starPositions[selectedStarId]
    if(!p) return

    // look directly at star
    target.set(p.x, p.y, p.z)

    // camera stops BEHIND star at fixed distance
    desired.set(p.x, p.y, p.z + 6)

    camera.position.lerp(desired, 0.06)
    camera.lookAt(target)

  })

}
