import type * as THREE from 'three'

// Three's whole-scene compile traverses hidden descendants as well as visible
// objects. Prepare the visible objects in separate tasks so retired geometry
// cannot monopolize the input thread during initial Home preparation.
export async function prepareHomeScene(
  renderer: Pick<THREE.WebGLRenderer, 'compileAsync'>,
  scene: THREE.Scene,
  camera: THREE.Camera,
  cancelled: () => boolean,
  yieldTask: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 0)),
) {
  const objects: THREE.Object3D[] = []
  scene.traverseVisible(object => {
    const renderable = object as THREE.Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean }
    if (renderable.isMesh || renderable.isPoints || renderable.isLine || renderable.isSprite) objects.push(object)
  })
  for (const object of objects) {
    await yieldTask()
    if (cancelled()) return
    // A shallow clone shares geometry/materials but excludes hidden children.
    // The original target scene still supplies its actual lights/environment.
    await renderer.compileAsync(object.clone(false), camera, scene)
  }
}
