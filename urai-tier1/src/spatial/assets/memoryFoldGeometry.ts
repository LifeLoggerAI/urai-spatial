import * as THREE from 'three'

/**
 * A closed, weathered asymmetric memory form.
 *
 * The source remains a watertight physical form, but its silhouette is pulled
 * into a thin folded stratum instead of reading as a rounded boulder. Callers
 * may still squash, rotate and tint it while retaining a readable underside,
 * non-uniform lobes and a scarred crown.
 */
export function memoryFoldGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 48, 34)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const deep = new THREE.Color('#263f3c')
  const mineral = new THREE.Color('#728b83')
  const pale = new THREE.Color('#c4d4cb')
  const phase = seed * .173

  for (let index = 0; index < positions.count; index += 1) {
    const sx = positions.getX(index)
    const sy = positions.getY(index)
    const sz = positions.getZ(index)
    const longitude = Math.atan2(sz, sx)
    const latitude = Math.asin(THREE.MathUtils.clamp(sy, -1, 1))

    const leftLobe = Math.exp(-(((sx + .34) / .72) ** 2 + ((sy - .12) / .70) ** 2))
    const rightLobe = Math.exp(-(((sx - .38) / .64) ** 2 + ((sy + .04) / .76) ** 2))
    const crown = THREE.MathUtils.smoothstep(sy, .02, .94)
    const cleft = crown * Math.exp(-((sx + .05) ** 2) / .045) * .34
    const seam = Math.exp(-((longitude + .48) ** 2) / .075) * Math.cos(latitude) * .15
    const weather = .045 * Math.sin(longitude * 5 + sy * 7 + phase)
      + .026 * Math.sin(longitude * 9 - sy * 4 + phase * .7)
    const asymmetry = .08 * Math.sin(longitude * 2.1 + phase) * Math.cos(latitude)

    const radial = .68 + .18 * leftLobe + .10 * rightLobe + weather + asymmetry
    const taper = THREE.MathUtils.lerp(.42, 1, THREE.MathUtils.smoothstep(sy, -.90, .12))
    let x = sx * radial * taper * .96 - leftLobe * .10 + rightLobe * .05 + sy * .12
    let y = sy * radial * .64 - cleft - .03 + leftLobe * .05
    let z = sz * radial * .32 - seam

    const twist = sy * .34 + .08 * Math.sin(sy * 3.2 + phase)
    const cosine = Math.cos(twist)
    const sine = Math.sin(twist)
    const tx = x * cosine - z * sine
    const tz = x * sine + z * cosine
    x = tx
    z = tz

    const lower = Math.max(0, -sy)
    y -= lower * (.08 + .08 * lower)
    positions.setXYZ(index, x, y, z)

    const height = THREE.MathUtils.clamp((y + .62) / 1.28, 0, 1)
    const scar = THREE.MathUtils.clamp(cleft * 3.2 + Math.max(0, seam) * 2.5, 0, 1)
    const color = deep.clone().lerp(mineral, .30 + height * .46).lerp(pale, scar * .34)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
