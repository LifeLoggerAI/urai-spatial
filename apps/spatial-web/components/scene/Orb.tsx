import { useRef, forwardRef } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";

const AuraPulseMaterial = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uColor: new THREE.Color("#00ccff"),
    uPulseSpeed: 1.5,
    uFresnelPower: 3.0,
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uPulseSpeed;
    uniform float uFresnelPower;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Rim effect for glow
      float rim = 1.0 - dot(normalize(vNormal), normalize(-vPosition));
      rim = pow(rim, uFresnelPower);

      // Pulsing effect
      float pulse = 0.6 + 0.4 * sin(uTime * uPulseSpeed);
      float glow = rim * pulse;

      // Final color with intensity for bloom
      vec3 finalColor = uColor * glow * 2.5;

      // Alpha for soft edges
      float alpha = glow;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ AuraPulseMaterial });

const Orb = forwardRef<THREE.Mesh>((props, ref) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh {...props} ref={ref}>
      <sphereGeometry args={[0.6, 64, 64]} />
      {/* @ts-ignore */}
      <auraPulseMaterial 
        ref={shaderRef} 
        transparent={true} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </mesh>
  );
});

Orb.displayName = 'Orb';

export default Orb;
