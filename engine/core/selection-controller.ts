import * as THREE from 'three'

type TransitionState = 'idle' | 'gliding' | 'focused'

class SelectionController {
  private transitionState: TransitionState = 'idle'
  private targetPosition = new THREE.Vector3()
  private cameraRef: THREE.Camera | null = null
  private onComplete?: () => void
  private glideSpeed = 2.2
  private lock = false

  attachCamera(camera: THREE.Camera) {
    this.cameraRef = camera
  }

  selectStar(id: string, worldPosition: THREE.Vector3, onComplete?: () => void) {
    if (this.transitionState !== 'idle') return
    if (!this.cameraRef) return

    this.transitionState = 'gliding'
    this.targetPosition.copy(worldPosition).add(new THREE.Vector3(0, 0, 20))
    this.onComplete = onComplete
    this.lock = true
  }

  update(delta: number) {
    if (!this.cameraRef) return
    if (this.transitionState !== 'gliding') return

    const cam = this.cameraRef
    cam.position.lerp(this.targetPosition, delta * this.glideSpeed)
    cam.lookAt(this.targetPosition)

    const dist = cam.position.distanceTo(this.targetPosition)
    if (dist < 0.05) {
      this.transitionState = 'focused'
      this.lock = false
      if (this.onComplete) this.onComplete()
    }
  }

  isLocked() {
    return this.lock
  }

  clear() {
    this.transitionState = 'idle'
    this.lock = false
  }

  getSelected() {
  }

  getState() {
    return this.transitionState
  }
}

export const selectionController = new SelectionController()
