import { extend, useThree, useFrame } from "@react-three/fiber"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass"

extend({ EffectComposer, RenderPass, UnrealBloomPass })

export default function EffectSystem() {
  const { gl, scene, camera } = useThree()
  const composer = new EffectComposer(gl)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  )
  composer.addPass(bloomPass)

  useFrame((_, delta) => {
    composer.render(delta)
  }, 1)

  return null
}
