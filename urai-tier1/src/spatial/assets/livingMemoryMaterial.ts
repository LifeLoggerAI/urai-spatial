import * as THREE from 'three'

// Thin, locally shaded lamellae reveal the memory nervature behind them.
// The field lives in object space, so orbiting the presence reveals real layers.
export function createLivingMemoryMaterial() {
  const time = { value: 0 }
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true,
    depthWrite: false, opacity: .82, roughness: .46, metalness: .08,
    clearcoat: .16, clearcoatRoughness: .48, sheen: .42,
    sheenColor: new THREE.Color('#c8a6a0'), emissive: new THREE.Color('#347a78'),
    emissiveIntensity: .12,
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
      float flow = sin(mp.y*4.5+mp.x*2.2+grain*5.0-uMemoryTime*.12);
      float nerve = pow(max(0.,1.-abs(flow)),18.);
      float edge = pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),1.5);
      diffuseColor.rgb *= mix(vec3(.55,.70,.69),vec3(1.1,.92,.80),smoothstep(.4,1.15,grain));
      diffuseColor.rgb += nerve*vec3(.10,.16,.13);
      diffuseColor.a *= clamp(.24+.44*edge+.16*grain+.16*nerve,.25,.88);
    `)
  }
  material.customProgramCacheKey = () => 'urai-living-memory-lamella-v1'
  return { material, time }
}
