import * as THREE from 'three'

type TransitionState = 'idle' | 'gliding' | 'focused'

class SelectionController {

  private transitionState: TransitionState = 'idle'

  private targetPosition = new THREE.Vector3()
  private focusPosition = new THREE.Vector3()

  private cameraRef: THREE.Camera | null = null

  private selectedId: string | null = null
  private onComplete?: () => void

  private glideSpeed = 2.2
  private lock = false

  private offset = new THREE.Vector3(0, 0, 20)

  attachCamera(camera: THREE.Camera) {
    this.cameraRef = camera
  }

  selectStar(id: string, worldPosition: THREE.Vector3, onComplete?: () => void) {

    if (this.transitionState !== 'idle') return
    if (!this.cameraRef) return

    this.transitionState = 'gliding'
    this.selectedId = id

    this.focusPosition.copy(worldPosition)

    this.targetPosition
      .copy(worldPosition)
      .add(this.offset)

    this.onComplete = onComplete
    this.lock = true
  }

  update(delta: number) {

    if (!this.cameraRef) return
    if (this.transitionState !== 'gliding') return

    const cam = this.cameraRef

    const lerpFactor = Math.min(delta * this.glideSpeed, 1)

    cam.position.lerp(this.targetPosition, lerpFactor)

    cam.lookAt(this.focusPosition)

    const dist = cam.position.distanceTo(this.targetPosition)

    if (dist < 0.05) {

      cam.position.copy(this.targetPosition)

      this.transitionState = 'focused'
      this.lock = false

      if (this.onComplete) {
        const cb = this.onComplete
        this.onComplete = undefined
        cb()
      }
    }
  }

  isLocked() {
    return this.lock
  }

  clear() {
    this.transitionState = 'idle'
    this.lock = false
    this.selectedId = null
    this.onComplete = undefined
  }

  getSelected() {
    return this.selectedId
  }

  getState() {
    return this.transitionState
  }

}

export const selectionController = new SelectionController()