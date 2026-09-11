'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Distant authored atmosphere only; terrain, paths and destinations remain real geometry. */
export function HomeAtmosphericSky({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color('#071922') },
      uMid: { value: new THREE.Color('#244044') },
      uHorizon: { value: new THREE.Color('#696c60') },
      uCloud: { value: new THREE.Color('#68837f') },
      uWarm: { value: new THREE.Color('#bc835b') },
    },
    vertexShader: 'varying vec3 vDirection; void main() { vDirection=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime;
      uniform vec3 uZenith, uMid, uHorizon, uCloud, uWarm;

      float hash(vec3 p) {
        p=fract(p*.3183099+.13);
        p*=17.;
        return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
      }

      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(
          mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),
          f.z
        );
      }

      void main() {
        vec3 direction=normalize(vDirection);
        float elevation=max(0.,direction.y);
        float lower=smoothstep(-.035,.18,direction.y);
        float upper=smoothstep(.13,.70,direction.y);
        vec3 sky=mix(uHorizon,uMid,lower);
        sky=mix(sky,uZenith,upper);

        vec3 p=direction*vec3(5.4,20.,5.4)+vec3(uTime*.0012,0.,uTime*.00025);
        float cloud=noise(p)+.48*noise(p*2.03+2.1)+.20*noise(p*4.07-3.4);
        float band=smoothstep(.69,1.10,cloud)*smoothstep(.02,.10,elevation)*(1.-smoothstep(.48,.88,elevation));
        float veil=smoothstep(.78,1.18,noise(p*.58+9.3))*smoothstep(.08,.20,elevation)*(1.-smoothstep(.72,.96,elevation));
        sky=mix(sky,uCloud,band*.38+veil*.12);

        vec3 sunDir=normalize(vec3(-.68,.15,-.72));
        float sunDot=max(0.,dot(direction,sunDir));
        float halo=pow(sunDot,10.);
        float core=pow(sunDot,96.);
        sky+=uWarm*(halo*.13+core*.28);

        float horizonMist=(1.-smoothstep(.00,.15,elevation))*.12;
        sky=mix(sky,mix(uHorizon,uCloud,.34),horizonMist);

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
