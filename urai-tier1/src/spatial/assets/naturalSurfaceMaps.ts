import * as THREE from 'three'

// Deterministic authored mineral/lichen texture. No external source image.
export function createMineralMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
    const size = 256, heights = new Float32Array(size * size)
    const hash = (x: number, y: number) => {
      const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      return v - Math.floor(v)
    }
    const noise = (x: number, y: number, cells: number) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
      return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix % cells, iy % cells), hash((ix + 1) % cells, iy % cells), u), THREE.MathUtils.lerp(hash(ix % cells, (iy + 1) % cells), hash((ix + 1) % cells, (iy + 1) % cells), u), v)
    }
    const diffuse = new Uint8Array(size * size * 4), normal = new Uint8Array(diffuse.length), arm = new Uint8Array(diffuse.length)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let value = 0
      for (let octave = 0; octave < 6; octave++) { const cells = 4 * 2 ** octave; value += noise(x / size * cells, y / size * cells, cells) * .5 ** (octave + 1) }
      const grit = hash(x, y) > .93 ? .012 + hash(y, x) * .015 : 0
      heights[y * size + x] = value + grit
      const i = (y * size + x) * 4, grain = hash(x, y), lichen = noise(x / size * 8, y / size * 8, 8)
      diffuse[i] = 114 + value * 84 + grain * 3 + grit * 30
      diffuse[i + 1] = 116 + value * 82 + lichen * 4 + grit * 32
      diffuse[i + 2] = 111 + value * 84 + grit * 28
      diffuse[i + 3] = 255
      arm[i] = 245; arm[i + 1] = 190 + value * 55; arm[i + 2] = 0; arm[i + 3] = 255
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size]) * 1.4
      const dy = (heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x]) * 1.4
      const n = new THREE.Vector3(-dx, -dy, 1).normalize(), i = (y * size + x) * 4
      normal[i] = (n.x * .5 + .5) * 255; normal[i + 1] = (n.y * .5 + .5) * 255; normal[i + 2] = (n.z * .5 + .5) * 255; normal[i + 3] = 255
    }
    const textures = [diffuse, normal, arm].map((data, index) => {
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.anisotropy = 4; texture.needsUpdate = true
      return texture
    })
    return [textures[0], textures[1], textures[2]] as [THREE.Texture, THREE.Texture, THREE.Texture]
}
