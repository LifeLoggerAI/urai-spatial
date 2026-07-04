import * as THREE from 'three'

export const XR_PORTALS = [
  { id: 'ground', label: 'Ground headquarters', route: '/ground?mode=xr-camera', position: [-4.2, 1.55, -6.2] as const, color: 0x7fcfb0 },
  { id: 'life-map', label: 'Life Map galaxy', route: '/spatial/life-map', position: [4.2, 1.55, -6.2] as const, color: 0xa998cf },
  { id: 'home', label: 'Return Home', route: '/home', position: [0, 1.55, 7.6] as const, color: 0x8fbfd2 },
] as const

export type XrSessionLike = {
  end: () => Promise<void>
  addEventListener: (type: string, listener: () => void, options?: { once?: boolean }) => void
  inputSources?: ArrayLike<{ gamepad?: Gamepad }>
}

const LIMIT = 10.5
const RADIUS = 0.38
const WALK_SPEED = 3.1
const TURN_SPEED = 1.75
const SPAWN_Z = 5.8

function controllerRay(controller: THREE.Group, raycaster: THREE.Raycaster) {
  const rotation = new THREE.Matrix4().extractRotation(controller.matrixWorld)
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation).normalize()
}

function safeMove(position: THREE.Vector3, nextX: number, nextZ: number) {
  const x = THREE.MathUtils.clamp(nextX, -LIMIT + RADIUS, LIMIT - RADIUS)
  const z = THREE.MathUtils.clamp(nextZ, -LIMIT + RADIUS, LIMIT - RADIUS)
  const daisRadius = 2.18

  if (x * x + (z + 0.7) * (z + 0.7) < daisRadius * daisRadius) {
    const angle = Math.atan2(z + 0.7, x)
    position.set(
      Math.cos(angle) * daisRadius,
      position.y,
      Math.sin(angle) * daisRadius - 0.7,
    )
    return
  }

  position.set(x, position.y, z)
}

function makePortal(
  spec: (typeof XR_PORTALS)[number],
  targets: THREE.Object3D[],
) {
  const group = new THREE.Group()
  group.position.set(spec.position[0], spec.position[1], spec.position[2])
  group.rotation.y = spec.id === 'home' ? Math.PI : 0

  const stone = new THREE.MeshStandardMaterial({
    color: 0xb9ad98,
    roughness: 0.9,
    metalness: 0.02,
  })
  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x6b665e,
    roughness: 0.96,
    metalness: 0.01,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 0.18,
    roughness: 0.45,
    metalness: 0.08,
  })
  const veilMaterial = new THREE.MeshBasicMaterial({
    color: spec.color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 3.2, 0.62),
    stone,
  )
  const right = left.clone()
  left.position.x = -1.22
  right.position.x = 1.22
  left.castShadow = true
  right.castShadow = true

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.92, 0.5, 0.68),
    stone,
  )
  top.position.y = 1.6
  top.castShadow = true

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(3.22, 0.18, 0.92),
    darkStone,
  )
  cap.position.y = 1.93
  cap.castShadow = true

  const threshold = new THREE.Mesh(
    new THREE.BoxGeometry(3.12, 0.18, 1.25),
    darkStone,
  )
  threshold.position.y = -1.52
  threshold.position.z = 0.12
  threshold.receiveShadow = true

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(2.12, 2.82),
    veilMaterial,
  )
  veil.position.z = 0.08
  veil.userData.portalRoute = spec.route
  veil.userData.portalLabel = spec.label

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.026, 10, 64),
    accent,
  )
  ring.position.z = 0.11
  ring.scale.y = 1.25

  const lintelLight = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.055, 0.08),
    accent,
  )
  lintelLight.position.set(0, 1.28, 0.37)

  group.add(
    left,
    right,
    top,
    cap,
    threshold,
    veil,
    ring,
    lintelLight,
  )
  targets.push(veil)

  return group
}

function makeControllerLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, -8),
  ])

  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xd8f0f4,
      transparent: true,
      opacity: 0.76,
    }),
  )
}

function makeTree(x: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.scale.setScalar(scale)

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6c4d35,
    roughness: 1,
  })
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x43664a,
    roughness: 0.98,
  })
  const leafHighlight = new THREE.MeshStandardMaterial({
    color: 0x5d7c57,
    roughness: 0.96,
  })

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 2.4, 8),
    trunkMaterial,
  )
  trunk.position.y = 1.2
  trunk.castShadow = true

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 10, 8),
    leafMaterial,
  )
  crown.position.y = 2.7
  crown.scale.set(1, 1.2, 0.92)
  crown.castShadow = true

  const crownTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 10, 8),
    leafHighlight,
  )
  crownTop.position.set(0.18, 3.45, -0.08)
  crownTop.castShadow = true

  group.add(trunk, crown, crownTop)
  return group
}

function makeShrub(x: number, z: number, scale: number) {
  const shrub = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0x557052,
      roughness: 1,
    }),
  )
  shrub.position.set(x, 0.42 * scale, z)
  shrub.scale.set(scale, scale * 0.72, scale)
  shrub.castShadow = true
  return shrub
}

function addRealLifeEnvironment(scene: THREE.Scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d897f,
    roughness: 0.98,
    metalness: 0.01,
  })

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.56, 0.42),
      wallMaterial,
    )
    wall.position.set(
      Math.cos(angle) * 11.7,
      0.28,
      Math.sin(angle) * 11.7,
    )
    wall.rotation.y = -angle
    wall.castShadow = true
    wall.receiveShadow = true
    scene.add(wall)
  }

  const treePositions = [
    [-10.4, -7.2, 1.12],
    [-7.7, -11.1, 0.95],
    [-2.4, -12.3, 1.08],
    [3.1, -12.2, 0.94],
    [8.1, -10.2, 1.15],
    [11.1, -5.4, 1.02],
    [11.8, 2.2, 1.05],
    [8.8, 8.8, 1.14],
    [-8.8, 8.7, 1.08],
    [-11.8, 2.1, 1],
  ] as const

  treePositions.forEach(([x, z, scale]) => {
    scene.add(makeTree(x, z, scale))
  })

  const shrubPositions = [
    [-7.5, -5.1, 0.95],
    [-5.8, -8.5, 0.8],
    [6.2, -8.2, 0.86],
    [7.8, -4.8, 1],
    [-7.7, 4.8, 0.92],
    [7.9, 4.5, 0.94],
  ] as const

  shrubPositions.forEach(([x, z, scale]) => {
    scene.add(makeShrub(x, z, scale))
  })

  const hillMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f7967,
    roughness: 1,
  })
  const distantHills = [
    [-18, -22, 8, 3.8],
    [-8, -26, 10, 4.2],
    [8, -27, 11, 4.5],
    [20, -21, 9, 3.5],
  ] as const

  distantHills.forEach(([x, z, width, height]) => {
    const hill = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 1),
      hillMaterial,
    )
    hill.position.set(x, height * 0.22 - 0.2, z)
    hill.scale.set(width, height, width * 0.68)
    hill.receiveShadow = true
    scene.add(hill)
  })

  const pathMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7ad9c,
    roughness: 0.96,
  })
  const paths = [
    [0, 3.4, 2.25, 5.2, 0],
    [-2.95, -3.8, 2.2, 6.2, -0.56],
    [2.95, -3.8, 2.2, 6.2, 0.56],
    [0, 8.8, 2.1, 3.8, 0],
  ] as const

  paths.forEach(([x, z, width, depth, rotation]) => {
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, depth),
      pathMaterial,
    )
    path.position.set(x, 0.04, z)
    path.rotation.y = rotation
    path.receiveShadow = true
    scene.add(path)
  })

  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x7a5739,
    roughness: 0.88,
  })

  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.16, 0.62),
      benchMaterial,
    )
    seat.position.set(side * 4.9, 0.62, 2.5)
    seat.rotation.y = side * 0.22
    seat.castShadow = true

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.72, 0.12),
      benchMaterial,
    )
    back.position.set(side * 4.9, 0.98, 2.78)
    back.rotation.y = side * 0.22
    back.castShadow = true

    scene.add(seat, back)
  }
}

export class UraiXrWorldRuntime {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.05, 90)
  readonly rig = new THREE.Group()
  readonly keys = new Set<string>()
  readonly portalTargets: THREE.Object3D[] = []
  readonly floor: THREE.Mesh
  session: XrSessionLike | null = null
  reducedMotion = false
  private yaw = 0
  private pitch = 0
  private dragging = false
  private pointerX = 0
  private pointerY = 0
  private pointerMoved = false
  private snapReady = true
  private disposed = false
  private lastTime = performance.now()
  private orb: THREE.Mesh
  private orbRing: THREE.Mesh
  private stars: THREE.Points

  constructor(
    private mount: HTMLDivElement,
    private announce: (message: string) => void,
    private openRoute: (route: string, label: string) => void,
  ) {
    this.scene.background = new THREE.Color(0xb9d4e4)
    this.scene.fog = new THREE.Fog(0xb9d4e4, 18, 58)

    this.camera.position.set(0, 1.65, 0)
    this.camera.rotation.order = 'YXZ'
    this.rig.position.set(0, 0, SPAWN_Z)
    this.rig.add(this.camera)
    this.scene.add(this.rig)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.xr.enabled = true
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Explorable URAI XR entry world',
    )
    this.renderer.domElement.tabIndex = 0
    this.mount.appendChild(this.renderer.domElement)

    this.scene.add(
      new THREE.HemisphereLight(0xe2f2ff, 0x7a6b55, 1.8),
    )

    const key = new THREE.DirectionalLight(0xfff0d6, 3.2)
    key.position.set(-7, 12, 8)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 45
    key.shadow.camera.left = -16
    key.shadow.camera.right = 16
    key.shadow.camera.top = 16
    key.shadow.camera.bottom = -16
    this.scene.add(key)

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe4ad }),
    )
    sun.position.set(-24, 18, -42)
    this.scene.add(sun)

    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 72),
      new THREE.MeshStandardMaterial({
        color: 0x65735b,
        roughness: 1,
        metalness: 0,
      }),
    )
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    this.scene.add(this.floor)

    addRealLifeEnvironment(this.scene)

    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.15, 0.42, 48),
      new THREE.MeshStandardMaterial({
        color: 0xa59b89,
        roughness: 0.9,
        metalness: 0.02,
      }),
    )
    dais.position.set(0, 0.21, -0.7)
    dais.castShadow = true
    dais.receiveShadow = true
    this.scene.add(dais)

    const daisInset = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.52, 0.06, 48),
      new THREE.MeshStandardMaterial({
        color: 0x776f63,
        roughness: 0.82,
      }),
    )
    daisInset.position.set(0, 0.45, -0.7)
    daisInset.receiveShadow = true
    this.scene.add(daisInset)

    this.orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 5),
      new THREE.MeshPhysicalMaterial({
        color: 0xd9f8fb,
        emissive: 0x79dfe8,
        emissiveIntensity: 1.05,
        roughness: 0.12,
        metalness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    )
    this.orb.position.set(0, 2.05, -0.7)
    this.orb.userData.baseY = this.orb.position.y
    this.orb.castShadow = true
    this.scene.add(this.orb)

    const orbLight = new THREE.PointLight(0x8debf2, 1.7, 7, 2)
    orbLight.position.copy(this.orb.position)
    this.scene.add(orbLight)

    this.orbRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.024, 10, 80),
      new THREE.MeshBasicMaterial({
        color: 0xb8f3f5,
        transparent: true,
        opacity: 0.5,
      }),
    )
    this.orbRing.position.copy(this.orb.position)
    this.orbRing.rotation.x = Math.PI / 2.6
    this.scene.add(this.orbRing)

    XR_PORTALS.forEach((portal) => {
      this.scene.add(makePortal(portal, this.portalTargets))
    })

    this.stars = this.makeStars()
    this.scene.add(this.stars)
    this.bind()
    this.resize()
    this.renderer.setAnimationLoop(this.animate)
  }

  private makeStars() {
    const count = /OculusBrowser|Quest|Android|iPhone/i.test(
      navigator.userAgent,
    )
      ? 90
      : 160
    const points = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const radius = 8 + Math.random() * 24
      const theta = Math.random() * Math.PI * 2
      points[index * 3] = Math.cos(theta) * radius
      points[index * 3 + 1] = 1.8 + Math.random() * 10
      points[index * 3 + 2] = Math.sin(theta) * radius
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(points, 3),
    )

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xfff2d6,
        size: 0.035,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    )
  }

  private resize = () => {
    const width = Math.max(1, this.mount.clientWidth)
    const height = Math.max(1, this.mount.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    const mobile = /OculusBrowser|Quest|Android|iPhone/i.test(
      navigator.userAgent,
    )
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75),
    )
    this.renderer.setSize(width, height, false)
  }

  private keyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code)
    if (event.code === 'KeyR') this.recenter()
  }

  private keyUp = (event: KeyboardEvent) => this.keys.delete(event.code)

  private pointerDown = (event: PointerEvent) => {
    this.dragging = true
    this.pointerX = event.clientX
    this.pointerY = event.clientY
    this.pointerMoved = false
    this.renderer.domElement.setPointerCapture?.(event.pointerId)
  }

  private pointerMove = (event: PointerEvent) => {
    if (!this.dragging) return

    const dx = event.clientX - this.pointerX
    const dy = event.clientY - this.pointerY
    this.pointerX = event.clientX
    this.pointerY = event.clientY

    if (Math.abs(dx) + Math.abs(dy) > 2) {
      this.pointerMoved = true
    }

    this.yaw -= dx * 0.0032
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * 0.0026,
      -1.15,
      1.15,
    )
  }

  private cancelPointerDrag = (event?: PointerEvent) => {
    if (
      event &&
      this.renderer.domElement.hasPointerCapture?.(event.pointerId)
    ) {
      this.renderer.domElement.releasePointerCapture?.(
        event.pointerId,
      )
    }

    this.dragging = false
    this.pointerMoved = false
  }

  private windowBlur = () => this.cancelPointerDrag()

  private pointerUp = (event: PointerEvent) => {
    const moved = this.pointerMoved
    this.cancelPointerDrag(event)

    if (moved) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, this.camera)

    const hit = raycaster.intersectObjects(
      this.portalTargets,
      false,
    )[0]
    const route = hit?.object.userData.portalRoute as
      | string
      | undefined
    const label = hit?.object.userData.portalLabel as
      | string
      | undefined

    if (route && label) {
      this.openRoute(route, label)
    }
  }

  private bind() {
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.windowBlur)
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
      const controller = this.renderer.xr.getController(index)
      controller.add(makeControllerLine())
      controller.addEventListener('select', () => {
        controllerRay(controller, raycaster)

        const portal = raycaster.intersectObjects(
          this.portalTargets,
          false,
        )[0]
        const route = portal?.object.userData.portalRoute as
          | string
          | undefined
        const label = portal?.object.userData.portalLabel as
          | string
          | undefined

        if (route && label) {
          return this.openRoute(route, label)
        }

        const floorHit = raycaster.intersectObject(this.floor, false)[0]

        if (floorHit) {
          safeMove(
            this.rig.position,
            floorHit.point.x,
            floorHit.point.z,
          )
          this.announce(
            'Teleported inside the safe garden boundary.',
          )
        }
      })

      this.rig.add(controller)
    }
  }

  private animate = (time: number) => {
    if (this.disposed) return

    const delta = Math.min(
      0.05,
      Math.max(0, (time - this.lastTime) / 1000),
    )
    this.lastTime = time

    this.orb.position.y =
      (this.orb.userData.baseY as number) +
      Math.sin(time * 0.0014) *
        (this.reducedMotion ? 0.025 : 0.08)
    this.orb.rotation.y +=
      delta * (this.reducedMotion ? 0.12 : 0.3)
    this.orbRing.position.y = this.orb.position.y
    this.orbRing.rotation.z +=
      delta * (this.reducedMotion ? 0.08 : 0.2)
    this.stars.rotation.y +=
      delta * (this.reducedMotion ? 0.001 : 0.004)

    if (!this.renderer.xr.isPresenting) {
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')

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

      Array.from(this.session.inputSources).forEach((source) => {
        const axes = source.gamepad?.axes ?? []
        const candidate =
          Math.abs(axes[2] ?? 0) > Math.abs(axes[0] ?? 0)
            ? axes[2] ?? 0
            : axes[0] ?? 0

        if (Math.abs(candidate) > Math.abs(axis)) {
          axis = candidate
        }
      })

      if (Math.abs(axis) < 0.35) {
        this.snapReady = true
      }

      if (this.snapReady && Math.abs(axis) > 0.72) {
        this.rig.rotation.y -=
          Math.sign(axis) * (Math.PI / 6)
        this.snapReady = false
        this.announce('Snap turn: 30°')
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  setKey(code: string, held: boolean) {
    if (held) {
      this.keys.add(code)
    } else {
      this.keys.delete(code)
    }
  }

  recenter() {
    this.rig.position.set(0, 0, SPAWN_Z)
    this.rig.rotation.set(0, 0, 0)
    this.yaw = 0
    this.pitch = 0
    this.announce('Position and view recentered.')
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.windowBlur)
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
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        materials.forEach((material) => material?.dispose())
      }
    })

    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
