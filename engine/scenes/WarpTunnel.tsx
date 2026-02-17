"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
export default function WarpTunnel() {
    const materialRef = useRef<THREE.ShaderMaterial>(null!);
    useFrame((state) => { materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime(); });
    return (
        <mesh position={[0, 0, -200]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1, 50, 600, 64, 1, true]} />
            <shaderMaterial ref={materialRef} transparent side={THREE.BackSide} uniforms={{ uTime: { value: 0 } }}
                vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
                fragmentShader={`uniform float uTime; varying vec2 vUv;
                    void main() {
                        float speed = 8.0;
                        float r = fract(vUv.x * 40.0 - uTime * speed);
                        float g = fract(vUv.y * 20.0 + uTime * speed);
                        float alpha = pow(1.0 - vUv.y, 4.0);
                        gl_FragColor = vec4(r, g, 1.0, alpha * 0.8);
                    }`}
            />
        </mesh>
    );
}
