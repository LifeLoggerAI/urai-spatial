import * as THREE from 'three'

/**
 * A closed, weathered asymmetric memory form.
 *
 * This deliberately replaces the old open lamella/fin primitive. Callers can
 * still squash, rotate and tint the geometry, but the source form always has
 * physical thickness, a readable underside, non-uniform lobes and a scarred
 * crown so it reads as a material memory manifestation rather than a sheet.
 */
export function memoryFoldGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 48, 34)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const deep = new THREE.Color('#304c49')
  const mineral = new THREE.Color('#718a82')
  const pale = new THREE.Color('#b5cbc1')
  const phase = seed * .173

  for (let index = 0; index < positions.count; index += 1) {
    const sx = positions.getX(index)
    const sy = positions.getY(index)
    const sz = positions.getZ(index)
    const longitude = Math.atan2(sz, sx)
    const latitude = Math.asin(THREE.MathUtils.clamp(sy, -1, 1))

    const leftLobe = Math.exp(-(((sx + .34) / .72) ** 2 + ((sy - .12) / .70) ** 2))
    const rightLobe = Math.exp(-(((sx - .38) / .64) ** 2 + ((sy + .04) / .76) ** 2))
    const crown = THREE.MathUtils.smoothstep(sy, .04, .94)
    const cleft = crown * Math.exp(-((sx + .05) ** 2) / .055) * .24
    const seam = Math.exp(-((longitude + .48) ** 2) / .09) * Math.cos(latitude) * .11
    const weather = .055 * Math.sin(longitude * 5 + sy * 7 + phase)
      + .032 * Math.sin(longitude * 9 - sy * 4 + phase * .7)
    const asymmetry = .10 * Math.sin(longitude * 2.1 + phase) * Math.cos(latitude)

    const radial = .72 + .16 * leftLobe + .11 * rightLobe + weather + asymmetry
    const taper = THREE.MathUtils.lerp(.64, 1, THREE.MathUtils.smoothstep(sy, -.92, .18))
    let x = sx * radial * taper - leftLobe * .075 + rightLobe * .055
    let y = sy * radial * .98 - cleft - .06
    let z = sz * radial * .62 - seam

    const twist = sy * .28 + .07 * Math.sin(sy * 3.2 + phase)
    const cosine = Math.cos(twist)
    const sine = Math.sin(twist)
    const tx = x * cosine - z * sine
    const tz = x * sine + z * cosine
    x = tx
    z = tz

    positions.setXYZ(index, x, y, z)

    const height = THREE.MathUtils.clamp((y + .75) / 1.55, 0, 1)
    const scar = THREE.MathUtils.clamp(cleft * 2.8 + Math.max(0, seam) * 2.2, 0, 1)
    const color = deep.clone().lerp(mineral, .24 + height * .42).lerp(pale, scar * .25)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
