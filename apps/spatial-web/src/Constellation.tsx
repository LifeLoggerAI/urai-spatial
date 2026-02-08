"use client";

import React from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import Star from "./Star";
import { Memory } from "./lib/types";

export default function Constellation({ memories }: { memories: Memory[] }) {
  const points = memories.map((memory) => new THREE.Vector3(memory.transform.position.x, memory.transform.position.y, memory.transform.position.z));

  return (
    <group>
      {memories.map((memory) => (
        <Star key={memory.id} memory={memory} />
      ))}
      <Line points={points} color="white" lineWidth={1} />
    </group>
  );
}
