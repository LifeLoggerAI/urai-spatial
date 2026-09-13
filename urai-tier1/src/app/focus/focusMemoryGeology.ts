import * as THREE from 'three'

// Canonical selected-memory manifestation geometry.
// The memory is a celestial body approached from Life Map, not a flower seated on
// the chamber floor. These authored shell sectors form one irregular luminous body
// while preserving an asymmetric silhouette and non-repeating memory/history veins.
const SHELL_SECTORS = [
  [-Math.PI, -2.08, 1.08, .08, -.05],
  [-2.16, -1.04, 1.14, -.06, .04],
  [-1.12, -.04, 1.05, .04, -.03],
  [-.12, .98, 1.16, -.04, .05],
  [.90, 2.03, 1.07, .07, -.02],
  [1.95, Math.PI, 1.12, -.05, .03],
] as const

export function createFocusStrata() {
  return SHELL_SECTORS.map(([phiStart, phiEnd, baseRadius, offsetX, offsetZ], sector) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 34, columns = 28

    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const v = row / rows
      const u = column / columns
      const theta = THREE.MathUtils.lerp(.18, Math.PI - .18, v)
      const phi = THREE.MathUtils.lerp(phiStart, phiEnd, u)
      const historyWave = Math.sin(theta * 8.4 + phi * 5.1 + sector * 1.73)
      const fineWave = Math.sin(theta * 17.2 - phi * 9.6 + sector * .83)
      const lobe = .10 * Math.sin(theta * 2.6 + sector * .71) * Math.cos(phi * 1.8 - sector)
      const cleft = -.12 * Math.exp(-((Math.cos(phi + .62) / .26) ** 2)) * Math.pow(Math.sin(theta), 2.2)
      const radius = baseRadius * (1 + lobe + historyWave * .025 + fineWave * .012 + cleft)
      const equatorStretch = 1 + .12 * Math.pow(Math.sin(theta), 2)
      const x = offsetX + Math.sin(theta) * Math.cos(phi) * radius * equatorStretch
      const y = .08 + Math.cos(theta) * radius * 1.08 + .06 * Math.sin(phi * 2.1 + sector)
      const z = offsetZ + Math.sin(theta) * Math.sin(phi) * radius * .92
      positions.push(x, y, z)
      uvs.push(u * 1.6, v * 1.8)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(historyWave)), 14)
      const hotVein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(theta * 4.2 + phi * 3.7 + sector))), 18)
      const core = new THREE.Color(sector % 2 ? '#bfe9e8' : '#d8f7f5')
      const memory = new THREE.Color(sector % 3 === 0 ? '#ffd7a0' : '#9eeaff')
      const shadow = new THREE.Color('#315b68')
      const rim = Math.pow(Math.sin(theta), .7)
      const color = shadow.clone().lerp(core, .60 + rim * .24).lerp(memory, Math.min(.78, vein * .58 + hotVein * .42))
      color.multiplyScalar(.92 + .10 * Math.sin(u * Math.PI))
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
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*66 + Math.sin(v*15)*1.15 + Math.sin(v*37)*.18))
    const history=vein<.09 ? 1-vein/.09 : 0
    const layer=.5+.5*Math.sin(v*82+Math.sin(u*16)*.46)
    const value=.62+grain*.05+layer*.035
    h[y*size+x]=value-history*.010
    const i=(y*size+x)*4
    const r=Math.min(255,142+value*88+history*92)
    const g=Math.min(255,154+value*92+history*78)
    const b=Math.min(255,160+value*96+history*68)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,178+grain*34-layer*10),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.25
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.25
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
