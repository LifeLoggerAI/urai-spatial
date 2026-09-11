'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** A distant sky volume; terrain, paths and destinations remain real geometry. */
export function HomeAtmosphericSky({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color('#183744') },
      uHorizon: { value: new THREE.Color('#91a18c') },
      uCloud: { value: new THREE.Color('#789486') },
    },
    vertexShader: 'varying vec3 vDirection; void main() { vDirection=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      varying vec3 vDirection; uniform float uTime; uniform vec3 uZenith, uHorizon, uCloud;
      float hash(vec3 p) { p=fract(p*.3183099+.13); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        vec3 direction=normalize(vDirection);
        float elevation=max(0.,direction.y);
        vec3 sky=mix(uHorizon,uZenith,smoothstep(-.04,.75,direction.y));
        vec3 p=direction*vec3(3.5,8.,3.5)+vec3(uTime*.002,0.,0.);
        float cloud=noise(p)+.45*noise(p*2.03+2.1)+.18*noise(p*4.1-3.);
        float wisps=smoothstep(.87,1.18,cloud)*smoothstep(.05,.24,elevation)*(1.-smoothstep(.6,.94,elevation));
        sky=mix(sky,uCloud,wisps*.24);
        float warmth=pow(max(0.,dot(direction,normalize(vec3(-.65,.16,-.74)))),8.);
        sky+=vec3(.042,.024,.010)*warmth;
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }
    `,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ camera, clock }) => {
    if (mesh.current) mesh.current.position.copy(camera.position)
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
  })
  return <mesh ref={mesh} name="home-authored-distant-atmosphere" renderOrder={-100} material={material}>
    <sphereGeometry args={[74, 48, 32]} />
  </mesh>
}
