import * as THREE from 'three'

export type SpatialRealmId =
  | 'home'
  | 'ground'
  | 'life-map'
  | 'focus'
  | 'replay'

export const XR_PORTALS = [
  {
    id: 'home',
    realm: 'home',
    label: 'Return Home',
    route: '/',
    color: 0x67e8f9,
  },
  {
    id: 'ground',
    realm: 'ground',
    label: 'Ground headquarters',
    route: '/ground',
    color: 0x63e6be,
  },
  {
    id: 'life-map',
    realm: 'life-map',
    label: 'Life Map galaxy',
    route: '/life-map',
    color: 0xa78bfa,
  },
  {
    id: 'focus',
    realm: 'focus',
    label: 'Focus chamber',
    route: '/focus?memoryId=quiet-reset',
    color: 0xf0abfc,
  },
  {
    id: 'replay',
    realm: 'replay',
    label: 'Replay memory',
    route:
      '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
    color: 0xfbbf24,
  },
] as const

export const SPATIAL_REALM_LABELS: Record<SpatialRealmId, string> = {
  home: 'Home threshold',
  ground: 'Ground headquarters',
  'life-map': 'Life Map galaxy',
  focus: 'Focus memory chamber',
  replay: 'Replay memory world',
}

const SPATIAL_PATHS = new Set([
  '/',
  '/home',
  '/ground',
  '/life-map',
  '/spatial/life-map',
  '/focus',
  '/replay',
  '/spatial/ar-vr',
])

export function isSpatialRealmRoute(route: string) {
  const path = route.split('?')[0].replace(/\/$/, '') || '/'
  return SPATIAL_PATHS.has(path)
}

export function routeToRealm(route: string): SpatialRealmId {
  const path = route.split('?')[0].replace(/\/$/, '') || '/'

  if (path === '/ground') return 'ground'
  if (path === '/life-map' || path === '/spatial/life-map') {
    return 'life-map'
  }
  if (path === '/focus') return 'focus'
  if (path === '/replay') return 'replay'
  return 'home'
}

export type XrSessionLike = {
  end: () => Promise<void>
  addEventListener: (
    type: string,
    listener: () => void,
    options?: { once?: boolean },
  ) => void
  inputSources?: ArrayLike<{ gamepad?: Gamepad }>
}

type PortalSpec = (typeof XR_PORTALS)[number]

type PortalPlacement = {
  portal: PortalSpec
  position: readonly [number, number, number]
  rotationY?: number
}

const LIMIT = 15
const RADIUS = 0.38
const WALK_SPEED = 3.1
const TURN_SPEED = 1.75
const SPAWN_Z = 7.2

const REALM_PORTALS: Record<SpatialRealmId, readonly PortalPlacement[]> = {
  home: [
    {
      portal: XR_PORTALS[1],
      position: [-5.4, 1.55, -7.4],
    },
    {
      portal: XR_PORTALS[2],
      position: [5.4, 1.55, -7.4],
    },
    {
      portal: XR_PORTALS[3],
      position: [0, 2.1, -11.2],
    },
  ],
  ground: [
    {
      portal: XR_PORTALS[0],
      position: [0, 1.55, 9.8],
      rotationY: Math.PI,
    },
    {
      portal: XR_PORTALS[2],
      position: [6.8, 1.55, -8.8],
    },
    {
      portal: XR_PORTALS[3],
      position: [-6.8, 1.55, -8.8],
    },
  ],
  'life-map': [
    {
      portal: XR_PORTALS[0],
      position: [0, 1.55, 10.2],
      rotationY: Math.PI,
    },
    {
      portal: XR_PORTALS[1],
      position: [-7, 1.55, -8.4],
    },
    {
      portal: XR_PORTALS[3],
      position: [0, 2.1, -12],
    },
    {
      portal: XR_PORTALS[4],
      position: [7, 1.55, -8.4],
    },
  ],
  focus: [
    {
      portal: XR_PORTALS[2],
      position: [-6.2, 1.55, 7.8],
      rotationY: Math.PI,
    },
    {
      portal: XR_PORTALS[4],
      position: [0, 1.9, -10.8],
    },
    {
      portal: XR_PORTALS[0],
      position: [6.2, 1.55, 7.8],
      rotationY: Math.PI,
    },
  ],
  replay: [
    {
      portal: XR_PORTALS[3],
      position: [-6.2, 1.55, 8.2],
      rotationY: Math.PI,
    },
    {
      portal: XR_PORTALS[2],
      position: [6.2, 1.55, 8.2],
      rotationY: Math.PI,
    },
    {
      portal: XR_PORTALS[0],
      position: [0, 1.55, 11],
      rotationY: Math.PI,
    },
  ],
}

function controllerRay(
  controller: THREE.Group,
  raycaster: THREE.Raycaster,
) {
  const rotation = new THREE.Matrix4().extractRotation(
    controller.matrixWorld,
  )
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
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
  const daisRadius = 2.18

  if (
    x * x + (z + 0.7) * (z + 0.7) <
    daisRadius * daisRadius
  ) {
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
  placement: PortalPlacement,
  targets: THREE.Object3D[],
) {
  const { portal } = placement
  const group = new THREE.Group()
  group.position.set(
    placement.position[0],
    placement.position[1],
    placement.position[2],
  )
  group.rotation.y = placement.rotationY ?? 0

  const frame = new THREE.MeshStandardMaterial({
    color: portal.color,
    emissive: portal.color,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.54,
  })
  const veilMaterial = new THREE.MeshBasicMaterial({
    color: portal.color,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 3.3, 0.36),
    frame,
  )
  const right = left.clone()
  left.position.x = -1.22
  right.position.x = 1.22

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.62, 0.18, 0.36),
    frame,
  )
  top.position.y = 1.65

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(2.25, 3.08),
    veilMaterial,
  )
  veil.position.z = 0.03
  veil.userData.portalRoute = portal.route
  veil.userData.portalLabel = portal.label

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.055, 16, 96),
    frame,
  )
  outerRing.position.z = 0.08
  outerRing.scale.y = 1.3
  outerRing.userData.spin = 0.18

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.018, 10, 80),
    new THREE.MeshBasicMaterial({
      color: portal.color,
      transparent: true,
      opacity: 0.76,
    }),
  )
  innerRing.position.z = 0.11
  innerRing.scale.y = 1.3
  innerRing.userData.spin = -0.26

  group.add(left, right, top, veil, outerRing, innerRing)
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
      color: 0xbff8ff,
      transparent: true,
      opacity: 0.82,
    }),
  )
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Points ||
      child instanceof THREE.Line
    ) {
      child.geometry?.dispose()
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      materials.forEach((material) => {
        const map = (material as THREE.MeshStandardMaterial).map
        map?.dispose()
        material?.dispose()
      })
    }
  })
}

export class UraiXrWorldRuntime {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.05, 120)
  readonly rig = new THREE.Group()
  readonly keys = new Set<string>()
  readonly portalTargets: THREE.Object3D[] = []
  readonly floor: THREE.Mesh
  readonly realmGroup = new THREE.Group()

  session: XrSessionLike | null = null
  reducedMotion = false

  private currentRealm: SpatialRealmId = 'home'
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
  private animatedObjects: THREE.Object3D[] = []

  constructor(
    private mount: HTMLDivElement,
    private announce: (message: string) => void,
    private openRoute: (route: string, label: string) => void,
    initialRealm: SpatialRealmId = 'home',
  ) {
    this.scene.background = new THREE.Color(0x050816)
    this.scene.fog = new THREE.FogExp2(0x071125, 0.028)
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
    this.renderer.toneMappingExposure = 1.04
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.xr.enabled = true
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Explorable URAI spatial world',
    )
    this.renderer.domElement.tabIndex = 0
    this.mount.appendChild(this.renderer.domElement)

    this.scene.add(
      new THREE.HemisphereLight(0x8ad9ff, 0x07111f, 1.45),
    )
    const key = new THREE.DirectionalLight(0xd9f7ff, 2.5)
    key.position.set(4, 10, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    this.scene.add(key)

    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0c2631,
        roughness: 0.82,
        metalness: 0.12,
      }),
    )
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    this.scene.add(this.floor)

    this.orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.64, 5),
      new THREE.MeshPhysicalMaterial({
        color: 0xc8fbff,
        emissive: 0x4fe7ff,
        emissiveIntensity: 2.2,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.18,
        clearcoat: 1,
      }),
    )
    this.orb.position.set(0, 2.16, -0.7)
    this.orb.userData.baseY = this.orb.position.y
    this.orb.castShadow = true
    this.scene.add(this.orb)

    this.orbRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.035, 12, 96),
      new THREE.MeshBasicMaterial({
        color: 0x81f4ff,
        transparent: true,
        opacity: 0.74,
      }),
    )
    this.orbRing.position.copy(this.orb.position)
    this.orbRing.rotation.x = Math.PI / 2.6
    this.scene.add(this.orbRing)

    this.stars = this.makeStars()
    this.scene.add(this.stars)
    this.scene.add(this.realmGroup)

    this.setRealm(initialRealm, false)
    this.bind()
    this.resize()
    this.renderer.setAnimationLoop(this.animate)
  }

  get realm() {
    return this.currentRealm
  }

  setRealm(realm: SpatialRealmId, shouldAnnounce = true) {
    if (this.disposed) return

    while (this.realmGroup.children.length > 0) {
      const child = this.realmGroup.children.pop()
      if (child) {
        disposeObject(child)
        child.removeFromParent()
      }
    }

    this.portalTargets.length = 0
    this.animatedObjects = []
    this.currentRealm = realm
    this.applyRealmAtmosphere(realm)
    this.buildRealm(realm)
    this.recenter()

    if (shouldAnnounce) {
      this.announce(`${SPATIAL_REALM_LABELS[realm]} entered.`)
    }
  }

  private applyRealmAtmosphere(realm: SpatialRealmId) {
    const floorMaterial = this.floor
      .material as THREE.MeshStandardMaterial
    const starMaterial = this.stars.material as THREE.PointsMaterial

    const appearance: Record<
      SpatialRealmId,
      {
        background: number
        fog: number
        density: number
        floor: number
        emissive: number
        stars: number
        exposure: number
      }
    > = {
      home: {
        background: 0x030815,
        fog: 0x071528,
        density: 0.025,
        floor: 0x0b2530,
        emissive: 0x0c3446,
        stars: 0.72,
        exposure: 1.04,
      },
      ground: {
        background: 0x06100f,
        fog: 0x0b201d,
        density: 0.022,
        floor: 0x182621,
        emissive: 0x173f34,
        stars: 0.18,
        exposure: 1.08,
      },
      'life-map': {
        background: 0x02020d,
        fog: 0x09051e,
        density: 0.012,
        floor: 0x090616,
        emissive: 0x251443,
        stars: 1,
        exposure: 1.18,
      },
      focus: {
        background: 0x090412,
        fog: 0x1b0928,
        density: 0.024,
        floor: 0x1a0d22,
        emissive: 0x351247,
        stars: 0.46,
        exposure: 1.08,
      },
      replay: {
        background: 0x040308,
        fog: 0x1c1008,
        density: 0.032,
        floor: 0x1b120b,
        emissive: 0x4a2610,
        stars: 0.22,
        exposure: 1.12,
      },
    }

    const next = appearance[realm]
    this.scene.background = new THREE.Color(next.background)
    this.scene.fog = new THREE.FogExp2(next.fog, next.density)
    floorMaterial.color.setHex(next.floor)
    floorMaterial.emissive.setHex(next.emissive)
    floorMaterial.emissiveIntensity = 0.3
    starMaterial.opacity = next.stars
    this.renderer.toneMappingExposure = next.exposure
  }

  private buildRealm(realm: SpatialRealmId) {
    if (realm === 'ground') this.buildGround()
    else if (realm === 'life-map') this.buildLifeMap()
    else if (realm === 'focus') this.buildFocus()
    else if (realm === 'replay') this.buildReplay()
    else this.buildHome()

    REALM_PORTALS[realm].forEach((placement) => {
      const portal = makePortal(placement, this.portalTargets)
      this.realmGroup.add(portal)
      portal.children.forEach((child) => {
        if (child.userData.spin) this.animatedObjects.push(child)
      })
    })
  }

  private buildHome() {
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.3, 0.5, 64),
      new THREE.MeshStandardMaterial({
        color: 0x102d3d,
        emissive: 0x15536a,
        emissiveIntensity: 0.58,
        roughness: 0.28,
        metalness: 0.58,
      }),
    )
    dais.position.set(0, 0.24, -0.7)
    dais.castShadow = true
    dais.receiveShadow = true
    this.realmGroup.add(dais)

    const boundaryMaterial = new THREE.MeshStandardMaterial({
      color: 0x173a58,
      emissive: 0x0b3f64,
      emissiveIntensity: 0.38,
      roughness: 0.42,
      metalness: 0.4,
    })

    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2
      const height = 1.6 + (index % 5) * 0.44
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.22, height, 10),
        boundaryMaterial,
      )
      pillar.position.set(
        Math.cos(angle) * 13,
        height / 2,
        Math.sin(angle) * 13,
      )
      pillar.castShadow = true
      this.realmGroup.add(pillar)
    }

    const horizon = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.06, 10, 160),
      new THREE.MeshBasicMaterial({
        color: 0x5ee7ff,
        transparent: true,
        opacity: 0.22,
      }),
    )
    horizon.rotation.x = Math.PI / 2
    horizon.position.y = 0.08
    horizon.userData.spin = 0.018
    this.realmGroup.add(horizon)
    this.animatedObjects.push(horizon)
  }

  private buildGround() {
    const roomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.3, 24),
      new THREE.MeshStandardMaterial({
        color: 0x172a24,
        roughness: 0.62,
        metalness: 0.24,
      }),
    )
    roomFloor.position.y = -0.18
    roomFloor.receiveShadow = true
    this.realmGroup.add(roomFloor)

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x17332d,
      emissive: 0x0c2d28,
      emissiveIntensity: 0.28,
      roughness: 0.5,
      metalness: 0.18,
    })
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(24, 6, 0.35),
      wallMaterial,
    )
    backWall.position.set(0, 3, -12)
    this.realmGroup.add(backWall)

    const sideWallLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 5, 24),
      wallMaterial,
    )
    sideWallLeft.position.set(-12, 2.5, 0)
    const sideWallRight = sideWallLeft.clone()
    sideWallRight.position.x = 12
    this.realmGroup.add(sideWallLeft, sideWallRight)

    const stationMaterial = new THREE.MeshStandardMaterial({
      color: 0x244b41,
      emissive: 0x1b6957,
      emissiveIntensity: 0.46,
      roughness: 0.34,
      metalness: 0.42,
    })
    const stations = [
      [-6.5, -5.6],
      [0, -6.8],
      [6.5, -5.6],
      [-6.5, 1.5],
      [0, 0.2],
      [6.5, 1.5],
    ] as const

    stations.forEach(([x, z], index) => {
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.75, 1.8),
        stationMaterial,
      )
      desk.position.set(x, 0.55, z)
      desk.castShadow = true
      desk.userData.floatBase = desk.position.y
      desk.userData.floatSpeed = 0.00045 + index * 0.00003
      this.realmGroup.add(desk)
      this.animatedObjects.push(desk)

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.25),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0x9ef5dd : 0x88ddff,
          transparent: true,
          opacity: 0.36,
          side: THREE.DoubleSide,
        }),
      )
      screen.position.set(x, 1.68, z - 0.5)
      this.realmGroup.add(screen)
    })

    const avatarMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb7ffe9,
      emissive: 0x39d6ad,
      emissiveIntensity: 0.92,
      transparent: true,
      opacity: 0.68,
      roughness: 0.2,
      transmission: 0.16,
    })

    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2
      const avatar = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.05, 8, 16),
        avatarMaterial,
      )
      avatar.position.set(
        Math.cos(angle) * 8.8,
        1.15,
        Math.sin(angle) * 6.2 - 1.5,
      )
      avatar.userData.floatBase = avatar.position.y
      avatar.userData.floatSpeed = 0.0006 + index * 0.00002
      this.realmGroup.add(avatar)
      this.animatedObjects.push(avatar)
    }
  }

  private buildLifeMap() {
    const galaxyCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xf3e8ff,
        emissive: 0xa855f7,
        emissiveIntensity: 2.4,
        roughness: 0.05,
        transmission: 0.28,
      }),
    )
    galaxyCore.position.set(0, 4.2, -5.5)
    galaxyCore.userData.floatBase = galaxyCore.position.y
    galaxyCore.userData.floatSpeed = 0.00042
    this.realmGroup.add(galaxyCore)
    this.animatedObjects.push(galaxyCore)

    const starMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd8f8ff,
      emissive: 0x8b5cf6,
      emissiveIntensity: 1.8,
      roughness: 0.12,
      transmission: 0.12,
    })

    const linePoints: THREE.Vector3[] = []
    for (let index = 0; index < 34; index += 1) {
      const ring = 3.8 + (index % 5) * 1.28
      const angle = index * 2.399963229728653
      const x = Math.cos(angle) * ring
      const y = 2.1 + ((index * 17) % 19) * 0.28
      const z = -5.5 + Math.sin(angle) * ring * 0.72
      const radius = index === 7 ? 0.42 : 0.16 + (index % 4) * 0.035
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 24),
        starMaterial,
      )
      star.position.set(x, y, z)
      star.userData.floatBase = y
      star.userData.floatSpeed = 0.00042 + (index % 7) * 0.00003
      star.userData.spin = 0.14 + (index % 5) * 0.025
      this.realmGroup.add(star)
      this.animatedObjects.push(star)
      if (index % 3 === 0) linePoints.push(star.position.clone())
    }

    const constellationGeometry = new THREE.BufferGeometry().setFromPoints(
      linePoints,
    )
    const constellation = new THREE.Line(
      constellationGeometry,
      new THREE.LineBasicMaterial({
        color: 0xc4b5fd,
        transparent: true,
        opacity: 0.34,
      }),
    )
    this.realmGroup.add(constellation)

    const galaxyDisc = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 10.5, 128),
      new THREE.MeshBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    galaxyDisc.rotation.x = -Math.PI / 2.35
    galaxyDisc.position.set(0, 3.8, -5.5)
    galaxyDisc.userData.spin = 0.025
    this.realmGroup.add(galaxyDisc)
    this.animatedObjects.push(galaxyDisc)
  }

  private buildFocus() {
    const chamber = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 64, 48),
      new THREE.MeshStandardMaterial({
        color: 0x3b164a,
        emissive: 0x531b69,
        emissiveIntensity: 0.34,
        transparent: true,
        opacity: 0.24,
        side: THREE.BackSide,
      }),
    )
    chamber.position.set(0, 3, -3.2)
    this.realmGroup.add(chamber)

    const memory = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 64, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0xffe9ff,
        emissive: 0xc026d3,
        emissiveIntensity: 1.6,
        roughness: 0.08,
        transmission: 0.24,
        clearcoat: 1,
      }),
    )
    memory.position.set(0, 3, -4.2)
    memory.userData.floatBase = memory.position.y
    memory.userData.floatSpeed = 0.00052
    memory.userData.spin = 0.16
    this.realmGroup.add(memory)
    this.animatedObjects.push(memory)

    for (let index = 0; index < 5; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4 + index * 0.48, 0.025, 10, 112),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0xf0abfc : 0x67e8f9,
          transparent: true,
          opacity: 0.42 - index * 0.045,
        }),
      )
      ring.position.copy(memory.position)
      ring.rotation.set(index * 0.3, index * 0.52, index * 0.18)
      ring.userData.spin = index % 2 ? -0.12 : 0.12
      this.realmGroup.add(ring)
      this.animatedObjects.push(ring)
    }
  }

  private buildReplay() {
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f2816,
      emissive: 0x7c3d12,
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.22,
    })
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.18, 24),
      pathMaterial,
    )
    path.position.set(0, 0.04, -3)
    this.realmGroup.add(path)

    for (let index = 0; index < 8; index += 1) {
      const z = 4 - index * 3
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.3 - index * 0.09, 0.06, 12, 96),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0xf59e0b : 0xf0abfc,
          transparent: true,
          opacity: 0.52,
        }),
      )
      ring.position.set(0, 3, z)
      ring.userData.spin = index % 2 ? -0.08 : 0.08
      this.realmGroup.add(ring)
      this.animatedObjects.push(ring)

      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 2.1),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0xffc56d : 0xf5d0fe,
          transparent: true,
          opacity: 0.12 + index * 0.025,
          side: THREE.DoubleSide,
        }),
      )
      frame.position.set(
        index % 2 ? -2.7 : 2.7,
        2.6 + (index % 3) * 0.42,
        z - 1.1,
      )
      frame.rotation.y = index % 2 ? Math.PI / 7 : -Math.PI / 7
      frame.userData.floatBase = frame.position.y
      frame.userData.floatSpeed = 0.00034 + index * 0.00002
      this.realmGroup.add(frame)
      this.animatedObjects.push(frame)
    }
  }

  private makeStars() {
    const count = /OculusBrowser|Quest|Android|iPhone/i.test(
      navigator.userAgent,
    )
      ? 220
      : 520
    const points = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const radius = 18 + Math.random() * 44
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
      points[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      points[index * 3 + 1] =
        Math.abs(radius * Math.cos(phi)) + 3
      points[index * 3 + 2] =
        radius * Math.sin(phi) * Math.sin(theta)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(points, 3),
    )

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xa8dfff,
        size: 0.085,
        transparent: true,
        opacity: 0.72,
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

  private keyUp = (event: KeyboardEvent) =>
    this.keys.delete(event.code)

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
    if (route && label) this.openRoute(route, label)
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
        if (route && label) return this.openRoute(route, label)

        const floorHit = raycaster.intersectObject(
          this.floor,
          false,
        )[0]
        if (floorHit) {
          safeMove(
            this.rig.position,
            floorHit.point.x,
            floorHit.point.z,
          )
          this.announce('Teleported inside the safe world boundary.')
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
        (this.reducedMotion ? 0.025 : 0.11)
    this.orb.rotation.y += delta * (this.reducedMotion ? 0.12 : 0.42)
    this.orbRing.rotation.z +=
      delta * (this.reducedMotion ? 0.08 : 0.28)
    this.stars.rotation.y +=
      delta * (this.reducedMotion ? 0.002 : 0.01)

    this.animatedObjects.forEach((object, index) => {
      const spin = object.userData.spin as number | undefined
      if (spin) object.rotation.z += delta * spin
      const floatBase = object.userData.floatBase as number | undefined
      const floatSpeed = object.userData.floatSpeed as number | undefined
      if (floatBase !== undefined && floatSpeed !== undefined) {
        object.position.y =
          floatBase +
          Math.sin(time * floatSpeed + index) *
            (this.reducedMotion ? 0.015 : 0.09)
      }
    })

    if (!this.renderer.xr.isPresenting) {
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
      const forward =
        Number(
          this.keys.has('KeyW') || this.keys.has('ArrowUp'),
        ) -
        Number(
          this.keys.has('KeyS') || this.keys.has('ArrowDown'),
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
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
