import * as THREE from 'three'
import {
  animatePremiumEnvironment,
  buildPremiumEnvironment,
  type PremiumEnvironment,
} from './xrEntryPremiumEnvironment'
import {
  GROUND_ROUTE,
  SKY_ROUTE,
} from './xrEntrySkyAndParticles'

export const XR_PORTALS = [
  {
    id: 'life-map',
    label: 'Ascend to Life Map',
    route: SKY_ROUTE,
    position: [0, 14, -18] as const,
    color: 0xa998cf,
  },
  {
    id: 'ground',
    label: 'Descend to Ground HQ',
    route: GROUND_ROUTE,
    position: [0, 0, -0.9] as const,
    color: 0x7fcfb0,
  },
  {
    id: 'home',
    label: 'Return Home',
    route: '/home',
    position: [0, 1.55, 8.2] as const,
    color: 0x8fbfd2,
  },
] as const

export type XrSessionLike = {
  end: () => Promise<void>
  addEventListener: (
    type: string,
    listener: () => void,
    options?: { once?: boolean },
  ) => void
  inputSources?: ArrayLike<{
    gamepad?: Gamepad
  }>
}

const LIMIT = 14.5
const RADIUS = 0.38
const WALK_SPEED = 3.25
const TURN_SPEED = 1.75
const SPAWN_Z = 8.4
const DAIS_Z = -0.9

function controllerRay(
  controller: THREE.Group,
  raycaster: THREE.Raycaster,
) {
  const rotation =
    new THREE.Matrix4().extractRotation(
      controller.matrixWorld,
    )
  raycaster.ray.origin.setFromMatrixPosition(
    controller.matrixWorld,
  )
  raycaster.ray.direction
    .set(0, 0, -1)
    .applyMatrix4(rotation)
    .normalize()
}

function safeMove(
  position: THREE.Vector3,
  nextX: number,
  nextZ: number,
) {
  const x = THREE.MathUtils.clamp(
    nextX,
    -LIMIT + RADIUS,
    LIMIT - RADIUS,
  )
  const z = THREE.MathUtils.clamp(
    nextZ,
    -LIMIT + RADIUS,
    LIMIT - RADIUS,
  )
  const relativeZ = z - DAIS_Z
  const daisRadius = 2.95

  if (
    x * x + relativeZ * relativeZ <
    daisRadius * daisRadius
  ) {
    const angle = Math.atan2(relativeZ, x)
    position.set(
      Math.cos(angle) * daisRadius,
      position.y,
      Math.sin(angle) * daisRadius + DAIS_Z,
    )
    return
  }

  position.set(x, position.y, z)
}

function makeControllerLine() {
  const geometry =
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -10),
    ])

  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xc8fbff,
      transparent: true,
      opacity: 0.78,
    }),
  )
}

export class UraiXrWorldRuntime {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera =
    new THREE.PerspectiveCamera(
      64,
      1,
      0.05,
      140,
    )
  readonly rig = new THREE.Group()
  readonly keys = new Set<string>()
  readonly portalTargets: THREE.Object3D[] = []
  readonly floor: THREE.Mesh

  session: XrSessionLike | null = null
  reducedMotion = false

  private readonly mobile =
    /OculusBrowser|Quest|Android|iPhone/i.test(
      navigator.userAgent,
    )
  private readonly environment:
    PremiumEnvironment
  private yaw = 0
  private pitch = -0.04
  private dragging = false
  private pointerX = 0
  private pointerY = 0
  private pointerMoved = false
  private snapReady = true
  private disposed = false
  private lastTime = performance.now()

  constructor(
    private mount: HTMLDivElement,
    private announce: (message: string) => void,
    private openRoute: (
      route: string,
      label: string,
    ) => void,
  ) {
    this.camera.position.set(0, 1.68, 0)
    this.camera.rotation.order = 'YXZ'
    this.rig.position.set(0, 0, SPAWN_Z)
    this.rig.add(this.camera)
    this.scene.add(this.rig)

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.mobile,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace =
      THREE.SRGBColorSpace
    this.renderer.toneMapping =
      THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.18
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap
    this.renderer.xr.enabled = true
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Living URAI XR threshold. Select the sky to ascend or the ground to descend.',
    )
    this.renderer.domElement.tabIndex = 0
    this.mount.appendChild(
      this.renderer.domElement,
    )

    this.environment =
      buildPremiumEnvironment(
        this.scene,
        this.mobile,
      )
    this.floor = this.environment.floor
    this.portalTargets.push(
      this.environment.sky,
      this.floor,
    )

    this.bind()
    this.resize()
    this.renderer.setAnimationLoop(
      this.animate,
    )
  }

  private resize = () => {
    const width = Math.max(
      1,
      this.mount.clientWidth,
    )
    const height = Math.max(
      1,
      this.mount.clientHeight,
    )

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        this.mobile ? 1.18 : 1.65,
      ),
    )
    this.renderer.setSize(
      width,
      height,
      false,
    )
  }

  private keyDown = (
    event: KeyboardEvent,
  ) => {
    this.keys.add(event.code)

    if (event.code === 'KeyR') {
      this.recenter()
    }
  }

  private keyUp = (
    event: KeyboardEvent,
  ) => {
    this.keys.delete(event.code)
  }

  private pointerDown = (
    event: PointerEvent,
  ) => {
    this.dragging = true
    this.pointerX = event.clientX
    this.pointerY = event.clientY
    this.pointerMoved = false
    this.renderer.domElement.setPointerCapture?.(
      event.pointerId,
    )
  }

  private pointerMove = (
    event: PointerEvent,
  ) => {
    if (!this.dragging) {
      return
    }

    const dx =
      event.clientX - this.pointerX
    const dy =
      event.clientY - this.pointerY

    this.pointerX = event.clientX
    this.pointerY = event.clientY

    if (Math.abs(dx) + Math.abs(dy) > 2) {
      this.pointerMoved = true
    }

    this.yaw -= dx * 0.0032
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * 0.0026,
      -1.22,
      1.22,
    )
  }

  private cancelPointerDrag = (
    event?: PointerEvent,
  ) => {
    if (
      event &&
      this.renderer.domElement.hasPointerCapture?.(
        event.pointerId,
      )
    ) {
      this.renderer.domElement.releasePointerCapture?.(
        event.pointerId,
      )
    }

    this.dragging = false
    this.pointerMoved = false
  }

  private windowBlur = () => {
    this.cancelPointerDrag()
  }

  private openRayDestination(
    raycaster: THREE.Raycaster,
  ) {
    const groundHit =
      raycaster.intersectObject(
        this.floor,
        false,
      )[0]

    if (groundHit) {
      this.openRoute(
        GROUND_ROUTE,
        'Ground headquarters',
      )
      return true
    }

    const skyHit =
      raycaster.intersectObject(
        this.environment.sky,
        false,
      )[0]

    if (skyHit) {
      this.openRoute(
        SKY_ROUTE,
        'Life Map galaxy',
      )
      return true
    }

    return false
  }

  private pointerUp = (
    event: PointerEvent,
  ) => {
    const moved = this.pointerMoved
    this.cancelPointerDrag(event)

    if (moved) {
      return
    }

    const rect =
      this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) /
        rect.width) *
        2 -
        1,
      -(
        ((event.clientY - rect.top) /
          rect.height) *
          2 -
        1
      ),
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(
      pointer,
      this.camera,
    )
    this.openRayDestination(raycaster)
  }

  private bind() {
    window.addEventListener(
      'resize',
      this.resize,
    )
    window.addEventListener(
      'keydown',
      this.keyDown,
    )
    window.addEventListener(
      'keyup',
      this.keyUp,
    )
    window.addEventListener(
      'blur',
      this.windowBlur,
    )
    this.renderer.domElement.addEventListener(
      'pointerdown',
      this.pointerDown,
    )
    this.renderer.domElement.addEventListener(
      'pointermove',
      this.pointerMove,
    )
    this.renderer.domElement.addEventListener(
      'pointerup',
      this.pointerUp,
    )
    this.renderer.domElement.addEventListener(
      'pointercancel',
      this.cancelPointerDrag,
    )
    this.renderer.domElement.addEventListener(
      'lostpointercapture',
      this.cancelPointerDrag,
    )

    const raycaster = new THREE.Raycaster()

    for (let index = 0; index < 2; index += 1) {
      const controller =
        this.renderer.xr.getController(index)
      controller.add(makeControllerLine())
      controller.addEventListener(
        'select',
        () => {
          controllerRay(
            controller,
            raycaster,
          )
          this.openRayDestination(
            raycaster,
          )
        },
      )
      this.rig.add(controller)
    }
  }

  private animate = (time: number) => {
    if (this.disposed) {
      return
    }

    const delta = Math.min(
      0.05,
      Math.max(
        0,
        (time - this.lastTime) / 1000,
      ),
    )
    this.lastTime = time

    animatePremiumEnvironment(
      this.environment,
      time,
      delta,
      this.mobile,
      this.reducedMotion,
    )

    if (!this.renderer.xr.isPresenting) {
      this.camera.rotation.set(
        this.pitch,
        this.yaw,
        0,
        'YXZ',
      )

      const forward =
        Number(
          this.keys.has('KeyW') ||
            this.keys.has('ArrowUp'),
        ) -
        Number(
          this.keys.has('KeyS') ||
            this.keys.has('ArrowDown'),
        )
      const strafe =
        Number(this.keys.has('KeyD')) -
        Number(this.keys.has('KeyA'))

      if (
        this.keys.has('KeyQ') ||
        this.keys.has('ArrowLeft')
      ) {
        this.yaw += TURN_SPEED * delta
      }

      if (
        this.keys.has('KeyE') ||
        this.keys.has('ArrowRight')
      ) {
        this.yaw -= TURN_SPEED * delta
      }

      if (forward || strafe) {
        const sin = Math.sin(this.yaw)
        const cos = Math.cos(this.yaw)

        safeMove(
          this.rig.position,
          this.rig.position.x +
            (strafe * cos - forward * sin) *
              WALK_SPEED *
              delta,
          this.rig.position.z +
            (strafe * sin - forward * cos) *
              WALK_SPEED *
              delta,
        )
      }
    } else if (this.session?.inputSources) {
      let axis = 0

      Array.from(
        this.session.inputSources,
      ).forEach((source) => {
        const axes =
          source.gamepad?.axes ?? []
        const candidate =
          Math.abs(axes[2] ?? 0) >
          Math.abs(axes[0] ?? 0)
            ? axes[2] ?? 0
            : axes[0] ?? 0

        if (
          Math.abs(candidate) >
          Math.abs(axis)
        ) {
          axis = candidate
        }
      })

      if (Math.abs(axis) < 0.35) {
        this.snapReady = true
      }

      if (
        this.snapReady &&
        Math.abs(axis) > 0.72
      ) {
        this.rig.rotation.y -=
          Math.sign(axis) * Math.PI / 6
        this.snapReady = false
        this.announce('Snap turn: 30°')
      }
    }

    this.renderer.render(
      this.scene,
      this.camera,
    )
  }

  setKey(
    code: string,
    held: boolean,
  ) {
    if (held) {
      this.keys.add(code)
    } else {
      this.keys.delete(code)
    }
  }

  recenter() {
    this.rig.position.set(
      0,
      0,
      SPAWN_Z,
    )
    this.rig.rotation.set(0, 0, 0)
    this.yaw = 0
    this.pitch = -0.04
    this.announce(
      'Position and view recentered.',
    )
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)

    window.removeEventListener(
      'resize',
      this.resize,
    )
    window.removeEventListener(
      'keydown',
      this.keyDown,
    )
    window.removeEventListener(
      'keyup',
      this.keyUp,
    )
    window.removeEventListener(
      'blur',
      this.windowBlur,
    )
    this.renderer.domElement.removeEventListener(
      'pointerdown',
      this.pointerDown,
    )
    this.renderer.domElement.removeEventListener(
      'pointermove',
      this.pointerMove,
    )
    this.renderer.domElement.removeEventListener(
      'pointerup',
      this.pointerUp,
    )
    this.renderer.domElement.removeEventListener(
      'pointercancel',
      this.cancelPointerDrag,
    )
    this.renderer.domElement.removeEventListener(
      'lostpointercapture',
      this.cancelPointerDrag,
    )

    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Points ||
        object instanceof THREE.Line
      ) {
        object.geometry?.dispose()
        const materials = Array.isArray(
          object.material,
        )
          ? object.material
          : [object.material]

        materials.forEach((material) => {
          material?.dispose()
        })
      }
    })

    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
