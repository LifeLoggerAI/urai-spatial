import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

export default function AmbientSystem() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000000, 0.007)
    const ambient = new THREE.AmbientLight(0x222222)
    scene.add(ambient)
    const keyLight = new THREE.DirectionalLight(
      new THREE.Color("hsl(30, 100%, 75%)"),
      1.0
    )
    keyLight.position.set(-100, 0, 100)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(new THREE.Color("blue"), 0.75)
    fillLight.position.set(100, 0, 100)
    scene.add(fillLight)
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0)
    backLight.position.set(100, 0, -100).normalize()
    scene.add(backLight)
  }, [scene])

  return null
}
