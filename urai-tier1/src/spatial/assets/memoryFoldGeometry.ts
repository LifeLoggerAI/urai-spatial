import * as THREE from 'three'

/** A cupped, tapering lamella with a rolled edge and a continuous midrib. */
export function memoryFoldGeometry(seed: number) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const rows = 48, columns = 20
  const pale = new THREE.Color('#c6ded5'), deep = new THREE.Color('#3e6974')
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, envelope = Math.pow(Math.sin(Math.PI * t), .78)
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1
      const width = envelope * (.38 + .045 * Math.sin(seed))
      const twist = t * .65 + seed * .19
      const x = u * width, z = .24 * u * u * envelope + .075 * Math.cos(u * Math.PI) * envelope
      positions.push(x * Math.cos(twist) + z * Math.sin(twist) + .22 * Math.sin(t * 2.8 + seed * .13), -.85 + t * 1.85, z * Math.cos(twist) - x * Math.sin(twist) + .14 * Math.sin(t * 4.1))
      const color = deep.clone().lerp(pale, .22 + .5 * Math.abs(u) ** 2 + .12 * t)
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + columns + 1
    indices.push(a, a + 1, b, a + 1, b + 1, b)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
