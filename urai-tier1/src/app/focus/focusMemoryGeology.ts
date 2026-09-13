import * as THREE from 'three'

// Canonical selected-memory manifestation geometry.
// Focus is the selected memory star resolving into an open field of suspended,
// non-concentric memory ribbons. Nothing shares a floor root and nothing closes
// into a sphere, flower, cage, spike cluster or boulder. The negative center is
// intentional: the remembered moment occupies the space between the fragments.
const MEMORY_RIBBONS = [
  [-2.55, .24, .76, 1.34, .34, -.12],
  [-.72, .04, .92, 1.08, .28, .18],
  [.82, .38, .70, 1.18, .30, -.20],
  [2.34, -.18, .84, .92, .24, .14],
] as const

export function createFocusStrata() {
  return MEMORY_RIBBONS.map(([centerPhi, yCenter, baseRadius, span, bandWidth, tilt], fragment) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 38, columns = 14

    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const v = row / rows
      const u = column / columns
      const along = v * 2 - 1
      const across = u * 2 - 1
      const taper = Math.pow(Math.sin(v * Math.PI), .55)
      const historyWave = Math.sin(v * 12.6 + across * 4.4 + fragment * 1.73)
      const fineWave = Math.sin(v * 27.4 - across * 9.2 + fragment * .81)
      const theta = centerPhi + along * span * .5 + .09 * Math.sin(v * Math.PI * 2 + fragment)
      const radius = baseRadius
        + .10 * Math.sin(v * Math.PI * 1.7 + fragment * .92)
        + historyWave * .022
        + fineWave * .009
      const width = bandWidth * (.25 + .75 * taper)
      const ribbonOffset = across * width
      const fold = across * .09 * Math.sin(v * Math.PI * 3.1 + fragment)

      // Tangent/normal decomposition keeps each fragment ribbon-like rather than
      // petal-like. Vertical centers differ so the fragments float independently.
      const radialX = Math.cos(theta)
      const radialZ = Math.sin(theta)
      const tangentX = -radialZ
      const tangentZ = radialX
      const x = radialX * radius + tangentX * ribbonOffset + .06 * Math.sin(v * 7.3 + fragment)
      const z = radialZ * radius * .78 + tangentZ * ribbonOffset * .68 + fold
      const y = yCenter
        + along * tilt
        + .28 * Math.sin(v * Math.PI + fragment * .46)
        + across * .10
        + .045 * historyWave

      positions.push(x, y, z)
      uvs.push(u * 1.8, v * 2.2)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(historyWave)), 13)
      const hotVein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(v * 6.8 + across * 3.8 + fragment))), 17)
      const edge = Math.pow(Math.abs(across), 1.5)
      const core = new THREE.Color(fragment % 2 ? '#b6eee7' : '#d9f6ef')
      const memory = new THREE.Color(fragment % 3 === 0 ? '#ffc786' : '#82dcff')
      const shadow = new THREE.Color('#1d4350')
      const color = shadow.clone()
        .lerp(core, .56 + taper * .24)
        .lerp(memory, Math.min(.86, vein * .55 + hotVein * .45))
      color.multiplyScalar(.94 + taper * .10 - edge * .12)
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
