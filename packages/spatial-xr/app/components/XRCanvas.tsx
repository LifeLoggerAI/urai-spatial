
"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Points, PointMaterial, OrbitControls, Line } from "@react-three/drei"
import { XR, VRButton, Controllers, Hands } from "@react-three/xr"
import { useEffect, useState, useRef, useMemo } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import * as THREE from "three"
import gsap from "gsap"

function CameraRig() {
  const { camera } = useThree();
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 6),
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(5, 0, -5),
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(-5, -2, -15),
      new THREE.Vector3(0, 0, -20),
    ]);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const position = curve.getPointAt((t / 10) % 1);
    camera.position.copy(position);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ... (Orb, WarpTunnel, Starfield, ParticleBloom, Avatar, and XRCanvas components remain the same)
