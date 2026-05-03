"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

export function CinematicCameraRig({ phase }) {
const { camera } = useThree();
const target = useRef({ x: 0, y: 0, z: 8 });

if (phase === "ASCENT") target.current = { x: 0, y: 4, z: 12 };
if (phase === "LIFEMAP") target.current = { x: 0, y: 0, z: 20 };
if (phase === "FOCUS") target.current = { x: 0, y: 0, z: 6 };
if (phase === "REPLAY") target.current = { x: 0, y: 0, z: 4 };

useFrame(() => {
camera.position.x += (target.current.x - camera.position.x) * 0.05;
camera.position.y += (target.current.y - camera.position.y) * 0.05;
camera.position.z += (target.current.z - camera.position.z) * 0.05;
camera.lookAt(0, 0, 0);
});

return null;
}
