import * as THREE from 'three'
import {
  DAIS_Z,
  premiumMaterial,
} from './xrEntrySkyAndParticles'

export function addLighting(
  scene: THREE.Scene,
  mobile: boolean,
) {
  scene.add(
    new THREE.HemisphereLight(
      0xb7e4ff,
      0x07121d,
      1.7,
    ),
  )

  const sun = new THREE.DirectionalLight(
    0xffdfbd,
    2.9,
  )
  sun.position.set(-8, 18, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(
    mobile ? 1024 : 1536,
    mobile ? 1024 : 1536,
  )
  sun.shadow.camera.left = -20
  sun.shadow.camera.right = 20
  sun.shadow.camera.top = 20
  sun.shadow.camera.bottom = -20
  sun.shadow.camera.far = 72
  scene.add(sun)

  const rim = new THREE.DirectionalLight(
    0x729cff,
    1.1,
  )
  rim.position.set(12, 10, -16)
  scene.add(rim)

  const orbLight = new THREE.PointLight(
    0x65e9ff,
    24,
    15,
    1.8,
  )
  orbLight.position.set(0, 2.45, DAIS_Z)
  scene.add(orbLight)
}

export function addArrivalDais(
  scene: THREE.Scene,
  mobile: boolean,
) {
  const glowRings: THREE.Mesh[] = []
  const dark = premiumMaterial(
    0x121f2b,
    0x071724,
    0.24,
    0.38,
    0.62,
  )
  const stone = premiumMaterial(
    0x293b48,
    0x08131b,
    0.14,
    0.28,
    0.62,
  )
  const gold = premiumMaterial(
    0xb08c57,
    0x744719,
    1.1,
    0.21,
    0.76,
  )
  const cyan = premiumMaterial(
    0x9ceeff,
    0x2fcff7,
    2.25,
    0.15,
    0.34,
  )

  const tiers = [
    [3.35, 0.22, 0.1, dark],
    [2.86, 0.28, 0.34, stone],
    [2.25, 0.2, 0.58, dark],
  ] as const

  tiers.forEach(
    ([radius, height, y, material]) => {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.96,
          radius,
          height,
          mobile ? 48 : 72,
        ),
        material,
      )
      tier.position.set(0, y, DAIS_Z)
      tier.castShadow = true
      tier.receiveShadow = true
      scene.add(tier)
    },
  )

  ;[3.08, 2.54, 1.84].forEach(
    (radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          radius,
          index === 2 ? 0.04 : 0.025,
          8,
          mobile ? 72 : 112,
        ),
        index === 2 ? cyan : gold,
      )
      ring.rotation.x = Math.PI / 2
      ring.position.set(
        0,
        0.48 + index * 0.06,
        DAIS_Z,
      )
      glowRings.push(ring)
      scene.add(ring)
    },
  )

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(
      1.68,
      mobile ? 48 : 72,
    ),
    new THREE.MeshPhysicalMaterial({
      color: 0x7fd3e5,
      emissive: 0x16475e,
      emissiveIntensity: 0.5,
      roughness: 0.12,
      metalness: 0.08,
      transmission: mobile ? 0 : 0.32,
      transparent: true,
      opacity: mobile ? 0.9 : 0.78,
    }),
  )
  glass.rotation.x = -Math.PI / 2
  glass.position.set(0, 0.69, DAIS_Z)
  scene.add(glass)

  const pathMaterial = premiumMaterial(
    0xa4875c,
    0x6e4319,
    0.9,
    0.26,
    0.66,
  )

  for (const side of [-1, 1]) {
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.075,
        0.035,
        12.6,
      ),
      pathMaterial,
    )
    path.position.set(side * 2.75, 0.02, 4.4)
    path.rotation.y = side * 0.17
    scene.add(path)
  }

  const arrivalRing = new THREE.Mesh(
    new THREE.TorusGeometry(
      5.9,
      0.035,
      8,
      mobile ? 72 : 120,
    ),
    cyan,
  )
  arrivalRing.rotation.x = Math.PI / 2
  arrivalRing.position.set(0, 0.02, 3.3)
  arrivalRing.scale.z = 0.58
  glowRings.push(arrivalRing)
  scene.add(arrivalRing)

  return glowRings
}

export function addSanctuaryArchitecture(
  scene: THREE.Scene,
  mobile: boolean,
) {
  const accentLights: THREE.PointLight[] = []
  const towerMaterial = premiumMaterial(
    0x253b4b,
    0x0a1d2b,
    0.2,
    0.44,
    0.44,
  )
  const trimMaterial = premiumMaterial(
    0xaa824d,
    0x6c3e15,
    0.8,
    0.24,
    0.72,
  )
  const gardenMaterial = premiumMaterial(
    0x174039,
    0x071c18,
    0.14,
    0.9,
    0.02,
  )
  const mountainMaterial = premiumMaterial(
    0x1a2b3a,
    0x06101a,
    0.07,
    0.98,
    0.02,
  )

  const towerCount = mobile ? 10 : 16
  for (
    let index = 0;
    index < towerCount;
    index += 1
  ) {
    const angle =
      (index / towerCount) * Math.PI * 2
    const radius =
      17.5 + (index % 3) * 2.1
    const height =
      3.8 + (index % 5) * 1.05

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        1.2,
        height,
        1.2,
      ),
      towerMaterial,
    )
    body.position.set(
      Math.cos(angle) * radius,
      height / 2,
      Math.sin(angle) * radius - 2,
    )
    body.rotation.y = -angle
    body.castShadow = true
    scene.add(body)

    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.84,
        0.62,
        0.38,
        8,
      ),
      trimMaterial,
    )
    crown.position.set(
      body.position.x,
      height + 0.18,
      body.position.z,
    )
    scene.add(crown)

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.24,
        1.55,
        8,
      ),
      trimMaterial,
    )
    spire.position.set(
      body.position.x,
      height + 1.12,
      body.position.z,
    )
    scene.add(spire)

    const light = new THREE.PointLight(
      index % 2 === 0
        ? 0x76e9ff
        : 0xffbb74,
      mobile ? 2.2 : 3.8,
      7,
      2,
    )
    light.position.set(
      body.position.x,
      height * 0.62,
      body.position.z,
    )
    accentLights.push(light)
    scene.add(light)
  }

  const gardenCount = mobile ? 12 : 20
  for (
    let index = 0;
    index < gardenCount;
    index += 1
  ) {
    const angle =
      (index / gardenCount) * Math.PI * 2
    const radius =
      12.8 + (index % 2) * 1.45

    const garden = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.72 + (index % 3) * 0.13,
        2.4 + (index % 4) * 0.35,
        7,
      ),
      gardenMaterial,
    )
    garden.position.set(
      Math.cos(angle) * radius,
      1.1,
      Math.sin(angle) * radius,
    )
    garden.castShadow = true
    scene.add(garden)
  }

  const mountainCount = mobile ? 16 : 28
  for (
    let index = 0;
    index < mountainCount;
    index += 1
  ) {
    const angle =
      (index / mountainCount) *
      Math.PI *
      2
    const radius =
      38 + (index % 4) * 4.5

    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(
        4.6 + (index % 5),
        12 + (index % 6) * 2.2,
        7,
      ),
      mountainMaterial,
    )
    mountain.position.set(
      Math.cos(angle) * radius,
      4.2,
      Math.sin(angle) * radius - 7,
    )
    mountain.rotation.y = angle
    scene.add(mountain)
  }

  return accentLights
}
