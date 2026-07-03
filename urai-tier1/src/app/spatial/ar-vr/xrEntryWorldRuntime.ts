import * as THREE from 'three'

export const XR_PORTALS = [
  { id: 'ground', label: 'Ground headquarters', route: '/ground?mode=xr-camera', position: [-4.2, 1.55, -6.2] as const, color: 0x63e6be },
  { id: 'life-map', label: 'Life Map galaxy', route: '/spatial/life-map', position: [4.2, 1.55, -6.2] as const, color: 0xa78bfa },
  { id: 'home', label: 'Return Home', route: '/home', position: [0, 1.55, 7.6] as const, color: 0x67e8f9 },
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
    position.set(Math.cos(angle) * daisRadius, position.y, Math.sin(angle) * daisRadius - 0.7)
    return
  }
  position.set(x, position.y, z)
}

function makePortal(spec: (typeof XR_PORTALS)[number], targets: THREE.Object3D[]) {
  const group = new THREE.Group()
  group.position.set(...spec.position)
  group.rotation.y = spec.id === 'home' ? Math.PI : 0
  const frame = new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.65, roughness: 0.24, metalness: 0.42 })
  const veilMaterial = new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 0.32), frame)
  const right = left.clone()
  left.position.x = -1.15
  right.position.x = 1.15
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.22, 0.32), frame)
  top.position.y = 1.55
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.9), veilMaterial)
  veil.position.z = 0.03
  veil.userData.portalRoute = spec.route
  veil.userData.portalLabel = spec.label
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 12, 64), frame)
  ring.position.z = 0.08
  ring.scale.y = 1.28
  group.add(left, right, top, veil, ring)
  targets.push(veil)
  return group
}

function makeControllerLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -8)])
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.82 }))
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

  constructor(private mount: HTMLDivElement, private announce: (message: string) => void, private openRoute: (route: string, label: string) => void) {
    this.scene.background = new THREE.Color(0x050816)
    this.scene.fog = new THREE.FogExp2(0x071125, 0.028)
    this.camera.position.set(0, 1.65, 0)
    this.camera.rotation.order = 'YXZ'
    this.rig.position.set(0, 0, SPAWN_Z)
    this.rig.add(this.camera)
    this.scene.add(this.rig)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.xr.enabled = true
    this.renderer.domElement.setAttribute('aria-label', 'Explorable URAI XR entry world')
    this.renderer.domElement.tabIndex = 0
    this.mount.appendChild(this.renderer.domElement)

    this.scene.add(new THREE.HemisphereLight(0x8ad9ff, 0x07111f, 1.5))
    const key = new THREE.DirectionalLight(0xd9f7ff, 2.6)
    key.position.set(4, 9, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    this.scene.add(key)

    this.floor = new THREE.Mesh(new THREE.CircleGeometry(12.5, 64), new THREE.MeshStandardMaterial({ color: 0x0c2631, roughness: 0.82, metalness: 0.12 }))
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    this.scene.add(this.floor)

    const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0x16324c, emissive: 0x0c2f4f, emissiveIntensity: 0.32, roughness: 0.5, metalness: 0.35 })
    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 8), boundaryMaterial)
      pillar.position.set(Math.cos(angle) * 10.8, 1.2, Math.sin(angle) * 10.8)
      pillar.castShadow = true
      this.scene.add(pillar)
    }

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.15, 0.45, 48), new THREE.MeshStandardMaterial({ color: 0x112b3b, emissive: 0x134a61, emissiveIntensity: 0.55, roughness: 0.36, metalness: 0.48 }))
    dais.position.set(0, 0.22, -0.7)
    dais.castShadow = true
    dais.receiveShadow = true
    this.scene.add(dais)

    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 4), new THREE.MeshStandardMaterial({ color: 0xbdf8ff, emissive: 0x4fe7ff, emissiveIntensity: 2.1, roughness: 0.18, metalness: 0.08 }))
    this.orb.position.set(0, 2.05, -0.7)
    this.orb.userData.baseY = this.orb.position.y
    this.orb.castShadow = true
    this.scene.add(this.orb)
    this.orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 10, 80), new THREE.MeshBasicMaterial({ color: 0x81f4ff, transparent: true, opacity: 0.72 }))
    this.orbRing.position.copy(this.orb.position)
    this.orbRing.rotation.x = Math.PI / 2.6
    this.scene.add(this.orbRing)

    XR_PORTALS.forEach((portal) => this.scene.add(makePortal(portal, this.portalTargets)))
    this.stars = this.makeStars()
    this.scene.add(this.stars)
    this.bind()
    this.resize()
    this.renderer.setAnimationLoop(this.animate)
  }

  private makeStars() {
    const count = /OculusBrowser|Quest|Android|iPhone/i.test(navigator.userAgent) ? 180 : 360
    const points = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const radius = 18 + Math.random() * 36
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
      points[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      points[index * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 4
      points[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xa8dfff, size: 0.08, transparent: true, opacity: 0.72 }))
  }

  private resize = () => {
    const width = Math.max(1, this.mount.clientWidth)
    const height = Math.max(1, this.mount.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    const mobile = /OculusBrowser|Quest|Android|iPhone/i.test(navigator.userAgent)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75))
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
    if (Math.abs(dx) + Math.abs(dy) > 2) this.pointerMoved = true
    this.yaw -= dx * 0.0032
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0026, -1.15, 1.15)
  }
  private cancelPointerDrag = (event?: PointerEvent) => {
    if (event && this.renderer.domElement.hasPointerCapture?.(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture?.(event.pointerId)
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
    const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, this.camera)
    const hit = raycaster.intersectObjects(this.portalTargets, false)[0]
    const route = hit?.object.userData.portalRoute as string | undefined
    const label = hit?.object.userData.portalLabel as string | undefined
    if (route && label) this.openRoute(route, label)
  }

  private bind() {
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.windowBlur)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove)
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp)
    this.renderer.domElement.addEventListener('pointercancel', this.cancelPointerDrag)
    this.renderer.domElement.addEventListener('lostpointercapture', this.cancelPointerDrag)
    const raycaster = new THREE.Raycaster()
    for (let index = 0; index < 2; index += 1) {
      const controller = this.renderer.xr.getController(index)
      controller.add(makeControllerLine())
      controller.addEventListener('select', () => {
        controllerRay(controller, raycaster)
        const portal = raycaster.intersectObjects(this.portalTargets, false)[0]
        const route = portal?.object.userData.portalRoute as string | undefined
        const label = portal?.object.userData.portalLabel as string | undefined
        if (route && label) return this.openRoute(route, label)
        const floorHit = raycaster.intersectObject(this.floor, false)[0]
        if (floorHit) {
          safeMove(this.rig.position, floorHit.point.x, floorHit.point.z)
          this.announce('Teleported inside the safe chamber boundary.')
        }
      })
      this.rig.add(controller)
    }
  }

  private animate = (time: number) => {
    if (this.disposed) return
    const delta = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000))
    this.lastTime = time
    this.orb.position.y = (this.orb.userData.baseY as number) + Math.sin(time * 0.0014) * (this.reducedMotion ? 0.025 : 0.11)
    this.orb.rotation.y += delta * (this.reducedMotion ? 0.12 : 0.42)
    this.orbRing.rotation.z += delta * (this.reducedMotion ? 0.08 : 0.28)
    this.stars.rotation.y += delta * (this.reducedMotion ? 0.002 : 0.01)

    if (!this.renderer.xr.isPresenting) {
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
      const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'))
      const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'))
      if (this.keys.has('KeyQ') || this.keys.has('ArrowLeft')) this.yaw += TURN_SPEED * delta
      if (this.keys.has('KeyE') || this.keys.has('ArrowRight')) this.yaw -= TURN_SPEED * delta
      if (forward || strafe) {
        const sin = Math.sin(this.yaw)
        const cos = Math.cos(this.yaw)
        safeMove(this.rig.position, this.rig.position.x + (strafe * cos - forward * sin) * WALK_SPEED * delta, this.rig.position.z + (strafe * sin - forward * cos) * WALK_SPEED * delta)
      }
    } else if (this.session?.inputSources) {
      let axis = 0
      Array.from(this.session.inputSources).forEach((source) => {
        const axes = source.gamepad?.axes ?? []
        const candidate = Math.abs(axes[2] ?? 0) > Math.abs(axes[0] ?? 0) ? axes[2] ?? 0 : axes[0] ?? 0
        if (Math.abs(candidate) > Math.abs(axis)) axis = candidate
      })
      if (Math.abs(axis) < 0.35) this.snapReady = true
      if (this.snapReady && Math.abs(axis) > 0.72) {
        this.rig.rotation.y -= Math.sign(axis) * Math.PI / 6
        this.snapReady = false
        this.announce('Snap turn: 30°')
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  setKey(code: string, held: boolean) {
    if (held) this.keys.add(code)
    else this.keys.delete(code)
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
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.removeEventListener('pointermove', this.pointerMove)
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp)
    this.renderer.domElement.removeEventListener('pointercancel', this.cancelPointerDrag)
    this.renderer.domElement.removeEventListener('lostpointercapture', this.cancelPointerDrag)
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material?.dispose())
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
