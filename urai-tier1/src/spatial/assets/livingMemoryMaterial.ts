import * as THREE from 'three'

// Thin, locally shaded lamellae reveal the memory nervature behind them.
// The field lives in object space, so orbiting the presence reveals real layers.
export function createLivingMemoryMaterial(solid = false) {
  const time = { value: 0 }
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: !solid,
    depthWrite: solid, opacity: solid ? 1 : .9, roughness: .38, metalness: .05,
    clearcoat: .26, clearcoatRoughness: .36, sheen: .56,
    sheenColor: new THREE.Color('#bca49e'), emissive: new THREE.Color('#245d59'),
    emissiveIntensity: .09,
  })
  material.onBeforeCompile = shader => {
    shader.uniforms.uMemoryTime = time
    shader.vertexShader = 'varying vec3 vMemoryPosition;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMemoryPosition = position;')
    shader.fragmentShader = `
      uniform float uMemoryTime;
      varying vec3 vMemoryPosition;
      float memoryHash(vec3 p) { p=fract(p*.3183099+.17); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float memoryNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(memoryHash(i),memoryHash(i+vec3(1,0,0)),f.x),mix(memoryHash(i+vec3(0,1,0)),memoryHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(memoryHash(i+vec3(0,0,1)),memoryHash(i+vec3(1,0,1)),f.x),mix(memoryHash(i+vec3(0,1,1)),memoryHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    ` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 mp = vMemoryPosition*4.2;
      float grain = memoryNoise(mp)+.5*memoryNoise(mp*2.03)+.25*memoryNoise(mp*4.07);
      float flow = sin(mp.y*4.5+mp.x*2.2+grain*7.0-uMemoryTime*.12);
      float nerve = pow(max(0.,1.-abs(flow)),24.)*smoothstep(.56,.98,grain);
      float edge = pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),1.35);
      float inner = smoothstep(.30,1.18,grain);
      diffuseColor.rgb *= mix(vec3(.40,.56,.55),vec3(.93,.80,.70),inner);
      diffuseColor.rgb += nerve*vec3(.10,.15,.13) + edge*vec3(.025,.055,.048);
      diffuseColor.a *= clamp(.62+.22*edge+.08*grain+.10*nerve,.58,.97);
    `)
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      float microRelief = memoryNoise(vMemoryPosition*54.0)*.0042 + memoryNoise(vMemoryPosition*112.0)*.0014;
      vec3 sigmaX=dFdx(vViewPosition), sigmaY=dFdy(vViewPosition);
      vec3 rx=cross(sigmaY,normal), ry=cross(normal,sigmaX);
      float determinant=dot(sigmaX,rx);
      normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(microRelief)*rx+dFdy(microRelief)*ry));
    `)
  }
  material.customProgramCacheKey = () => 'urai-living-memory-lamella-v3'
  return { material, time }
}
