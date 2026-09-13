import * as THREE from 'three'

// Canonical selected-memory manifestation geometry.
// Focus is the same selected memory star resolving into a broken mineral-light
// aperture: a large open center, thin irregular rim segments and history veins.
// It must read as a threshold into the remembered moment, never as floating cloth,
// a flower, a boulder, a crystal cluster or a generic sculptural object.
const MEMORY_APERTURE_ARCS = [
  [-2.86, -1.76, 1.48, 1.10, .105, -.035],
  [-1.47, -.34, 1.58, 1.18, .090, .045],
  [.10, 1.22, 1.52, 1.14, .100, -.020],
  [1.48, 2.76, 1.42, 1.07, .088, .055],
] as const

export function createFocusStrata() {
  return MEMORY_APERTURE_ARCS.map(([startAngle, endAngle, radiusX, radiusY, bandWidth, depthBias], fragment) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 48, columns = 8

    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const v = row / rows
      const u = column / columns
      const across = u * 2 - 1
      const taper = Math.pow(Math.sin(v * Math.PI), .62)
      const historyWave = Math.sin(v * 15.4 + across * 4.8 + fragment * 1.91)
      const fineWave = Math.sin(v * 31.2 - across * 8.7 + fragment * .73)
      const theta = THREE.MathUtils.lerp(startAngle, endAngle, v)
      const width = bandWidth * (.26 + .74 * taper)
      const radialOffset = across * width
      const localRadiusX = radiusX + radialOffset + historyWave * .018 + fineWave * .007
      const localRadiusY = radiusY + radialOffset * .72 + historyWave * .012

      // The aperture lives mostly in the camera-facing x/y plane. Depth is shallow
      // and irregular so the rim feels spatial without turning into detached slabs.
      const x = Math.cos(theta) * localRadiusX + .035 * Math.sin(v * 8.3 + fragment)
      const y = Math.sin(theta) * localRadiusY + .055 * Math.sin(v * 6.1 + fragment * .6) + across * .025
      const z = depthBias
        + .13 * Math.sin(theta * 2.0 + fragment * .7)
        + .045 * Math.sin(v * Math.PI * 3.0 + across * 1.8)

      positions.push(x, y, z)
      uvs.push(u * 1.4, v * 2.8)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(historyWave)), 15)
      const hotVein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(v * 7.2 + across * 4.1 + fragment))), 18)
      const edge = Math.pow(Math.abs(across), 1.35)
      const mineral = new THREE.Color(fragment % 2 ? '#8fc9c6' : '#badbd4')
      const memory = new THREE.Color(fragment % 2 ? '#7fdcff' : '#f0bd83')
      const shadow = new THREE.Color('#17333a')
      const color = shadow.clone()
        .lerp(mineral, .46 + taper * .28)
        .lerp(memory, Math.min(.88, vein * .58 + hotVein * .46))
      color.multiplyScalar(.86 + taper * .12 - edge * .18)
      colors.push(color.r, color.g, color.b)
    }

    const stride = columns + 1
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
      indices.push(a, b, c, b, d, c)
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingSphere()
    return result
  })
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512, h = new Float32Array(size * size), rgba = new Uint8Array(size * size * 4), normals = new Uint8Array(rgba.length), rough = new Uint8Array(rgba.length)
  const hash = (x:number,y:number) => { const v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v) }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*72 + Math.sin(v*17)*1.32 + Math.sin(v*39)*.22))
    const history=vein<.085 ? 1-vein/.085 : 0
    const layer=.5+.5*Math.sin(v*91+Math.sin(u*18)*.52)
    const value=.50+grain*.05+layer*.028
    h[y*size+x]=value-history*.012
    const i=(y*size+x)*4
    const r=Math.min(255,66+value*92+history*142)
    const g=Math.min(255,88+value*112+history*132)
    const b=Math.min(255,96+value*126+history*112)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,188+grain*30-layer*12),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.35
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.35
    const n=new THREE.Vector3(-dx,-dy,1).normalize()
    normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4)
  }
  const maps = [rgba,normals,rough].map((data,index)=>{
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping
    texture.generateMipmaps=true
    texture.minFilter=THREE.LinearMipmapLinearFilter
    texture.magFilter=THREE.LinearFilter
    texture.anisotropy=4
    texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace
    texture.needsUpdate=true
    return texture
  })
  return [maps[0], maps[1], maps[2]]
}
