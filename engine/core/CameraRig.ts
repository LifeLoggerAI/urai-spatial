"use client"
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
const targets = { home: new THREE.Vector3(0, 1.2, 16), chat: new THREE.Vector3(0, 0, 8) };
export default function CameraRig({ mode, isWarping }: { mode: string; isWarping: boolean; }) {
    const { camera } = useThree();
    useFrame((state, delta) => {
        if (isWarping) {
            camera.position.z -= delta * 250;
            camera.fov = THREE.MathUtils.lerp(camera.fov, 140, delta);
            camera.updateProjectionMatrix();
        } else {
            const target = targets[mode as keyof typeof targets] || targets.home;
            camera.position.lerp(target, 0.05);
            camera.fov = THREE.MathUtils.lerp(camera.fov, 60, delta);
            camera.updateProjectionMatrix();
            camera.lookAt(0, 0.5, 0);
        }
    });
    return null;
}
