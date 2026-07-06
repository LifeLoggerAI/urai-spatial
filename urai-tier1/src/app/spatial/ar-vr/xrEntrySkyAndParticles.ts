import * as THREE from 'three'

export const SKY_ROUTE = '/spatial/life-map'
export const GROUND_ROUTE = '/ground?mode=xr-camera'
export const DAIS_Z = -0.9

export function premiumMaterial(
  color: number,
  emissive: number,
  emissiveIntensity: number,
  roughness: number,
  metalness: number,
) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  })
}

function makePointField(
  count: number,
  mobile: boolean,
  kind: 'stars' | 'motes',
) {
  const points = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const radius =
      kind === 'motes'
        ? 0.9 + Math.random() * 4.2
        : 28 + Math.random() * 48
    const angle = Math.random() * Math.PI * 2

    points[index * 3] = Math.cos(angle) * radius
    points[index * 3 + 1] =
      kind === 'motes'
        ? 0.45 + Math.random() * 4.4
        : 7 + Math.random() * 50
    points[index * 3 + 2] =
      (kind === 'motes' ? DAIS_Z : 0) +
      Math.sin(angle) * radius
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(points, 3),
  )

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color:
        kind === 'motes'
          ? 0xb9f8ff
          : 0xd7eaff,
      size:
        kind === 'motes'
          ? mobile
            ? 0.035
            : 0.05
          : mobile
            ? 0.075
            : 0.1,
      transparent: true,
      opacity: kind === 'motes' ? 0.56 : 0.76,
      blending:
        kind === 'motes'
          ? THREE.AdditiveBlending
          : THREE.NormalBlending,
      depthWrite: false,
    }),
  )
}

export function createSky(
  mobile: boolean,
) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 worldPosition;
      void main() {
        vec4 world =
          modelMatrix * vec4(position, 1.0);
        worldPosition = world.xyz;
        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 worldPosition;
      void main() {
        vec3 direction = normalize(worldPosition);
        float height = direction.y * 0.5 + 0.5;
        vec3 color = mix(
          vec3(0.47, 0.36, 0.58),
          vec3(0.10, 0.28, 0.48),
          smoothstep(0.30, 0.58, height)
        );
        color = mix(
          color,
          vec3(0.018, 0.055, 0.16),
          smoothstep(0.58, 0.96, height)
        );
        vec3 sunDirection =
          normalize(vec3(-0.28, 0.08, -1.0));
        float sun = pow(
          max(dot(direction, sunDirection), 0.0),
          82.0
        );
        float glow = pow(
          max(dot(direction, sunDirection), 0.0),
          9.0
        );
        color += vec3(1.0, 0.5, 0.26) * sun * 2.4;
        color +=
          vec3(0.58, 0.30, 0.54) * glow * 0.42;
        float band = sin(
          direction.x * 14.0 +
          direction.z * 8.0 +
          uTime * 0.08
        );
        color +=
          vec3(0.09, 0.12, 0.32) *
          smoothstep(0.62, 0.95, height) *
          (0.5 + 0.5 * band) *
          0.16;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(
      78,
      mobile ? 28 : 40,
      22,
    ),
    material,
  )
  sky.userData.destinationRoute = SKY_ROUTE
  sky.userData.destinationLabel = 'Life Map galaxy'
  sky.renderOrder = -10

  return sky
}

export function createFloor(
  mobile: boolean,
) {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(
      24,
      mobile ? 64 : 96,
    ),
    premiumMaterial(
      0x142d3b,
      0x0a2335,
      0.22,
      0.34,
      0.58,
    ),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.04
  floor.receiveShadow = true
  floor.userData.destinationRoute = GROUND_ROUTE
  floor.userData.destinationLabel =
    'Ground headquarters'
  return floor
}

export function createAtmosphere(
  mobile: boolean,
) {
  return {
    stars: makePointField(
      mobile ? 260 : 680,
      mobile,
      'stars',
    ),
    motes: makePointField(
      mobile ? 72 : 150,
      mobile,
      'motes',
    ),
  }
}
