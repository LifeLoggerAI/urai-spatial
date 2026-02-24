'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { Points, PointMaterial, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// --- 1. State Management ---
let activeNodeId = null;
const activeNodeListeners = new Set();
const useActiveNode = () => {
  const [nodeId, setNodeId] = useState(activeNodeId);
  useEffect(() => {
    activeNodeListeners.add(setNodeId);
    return () => void activeNodeListeners.delete(setNodeId);
  }, []);
  return [nodeId, (id) => {
    activeNodeId = id;
    activeNodeListeners.forEach(fn => fn(id));
  }];
};

let bloomActive = false;
const bloomListeners = new Set();
const useBloom = () => {
    const [isBlooming, setBlooming] = useState(bloomActive);
    useEffect(() => {
        bloomListeners.add(setBlooming);
        return () => void bloomListeners.delete(setBlooming);
    }, []);
    return [isBlooming, (val) => {
        bloomActive = val;
        bloomListeners.forEach(fn => fn(val));
    }]
}

// --- 2. Deterministic Node Generation ---
function generateMemoryNodes(count = 200, seed = 'urai') {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const radius = 5 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    nodes.push({
      id: `node-${i}`,
      position: [x, y, z] as [number, number, number],
      emotionalIntensity: Math.random(),
      recencyWeight: Math.random(),
      significanceScore: Math.random(),
      clusterId: `cluster-${Math.floor(Math.random() * 10)}`
    });
  }
  return nodes;
}

// --- 3. Emotional Lighting Utility ---
function getEmotionLightingProfile(intensity) {
  const hue = 0.6 - intensity * 0.5; // From blue (calm) to red (intense)
  const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
  const ambientIntensity = 0.2 + intensity * 0.3;
  const keyIntensity = 0.4 + intensity * 0.7;
  return { color, ambientIntensity, keyIntensity };
}

// --- 4. Components ---
function MemoryStarField({ nodes, setActiveNode, activeNode }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    nodes.forEach((node, i) => {
      arr.set(node.position, i * 3);
    });
    return arr;
  }, [nodes]);

  return (
    <Points positions={positions} onClick={(e) => {
      e.stopPropagation();
      const index = (e as any).index;
      setActiveNode(nodes[index].id);
    }}>
      <PointMaterial
        size={0.1}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={activeNode ? 0.4 : 0.7}
        color="#ffffff"
      />
    </Points>
  );
}

function ConstellationLayer({ nodes, activeNode }) {
  const lines = useMemo(() => {
    const clusters = nodes.reduce((acc, node) => {
      if (!acc[node.clusterId]) acc[node.clusterId] = [];
      acc[node.clusterId].push(node);
      return acc;
    }, {} as Record<string, any[]>);

    const allLines: [THREE.Vector3, THREE.Vector3][] = [];
    for (const clusterId in clusters) {
      const clusterNodes = clusters[clusterId];
      for (let i = 0; i < clusterNodes.length - 1; i++) {
        allLines.push([new THREE.Vector3(...clusterNodes[i].position), new THREE.Vector3(...clusterNodes[i+1].position)]);
      }
    }
    return allLines;
  }, [nodes]);

  return (
    <>
      {lines.map((line, index) => (
        <Line key={index} points={line} color="#ffffff" lineWidth={0.5} transparent opacity={activeNode ? 0.05 : 0.1} />
      ))}
    </>
  );
}

function MemoryBloom({ nodes, activeNode, bloom }) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const activeNodeData = useMemo(() => {
        return nodes.find(n => n.id === activeNode)
    }, [nodes, activeNode])

    useFrame(() => {
        if (!meshRef.current) return;
        if (!bloom) {
            meshRef.current.scale.set(0, 0, 0);
            return;
        }
        meshRef.current.scale.lerp(new THREE.Vector3(2, 2, 2), 0.08);
    })

    if (!activeNodeData) return null;

    return (
        <mesh ref={meshRef} position={activeNodeData.position}>
            <sphereGeometry args={[0.2, 32, 32]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>
    )
}

// --- 5. Main Scene ---
export default function LifeReviewScene() {
  const nodes = useMemo(() => generateMemoryNodes(), []);
  const [activeNode, _setActiveNode] = useActiveNode();
  const [bloom, setBloom] = useBloom();

  const activeNodeData = useMemo(() => {
    return nodes.find(n => n.id === activeNode);
  }, [nodes, activeNode]);

  const setActiveNode = (id) => {
      _setActiveNode(id);
      if (id) {
        setTimeout(() => setBloom(true), 600);
      } else {
        setBloom(false);
      }
  }

  useFrame((state) => {
    // Camera
    if (activeNodeData) {
        const targetPosition = new THREE.Vector3(...activeNodeData.position);
        let cameraTargetPos: THREE.Vector3;

        if (bloom) {
            const time = state.clock.getElapsedTime();
            const driftRadius = 1.2;
            const driftSpeed = 0.1;
            const offsetX = Math.cos(time * driftSpeed) * driftRadius;
            const offsetY = Math.sin(time * driftSpeed * 0.5) * 0.2;
            const offsetZ = Math.sin(time * driftSpeed) * driftRadius;
            cameraTargetPos = targetPosition.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        } else {
            cameraTargetPos = targetPosition.clone().add(new THREE.Vector3(0, 0, 3));
        }

        state.camera.position.lerp(cameraTargetPos, 0.03);
        state.camera.lookAt(targetPosition);
    }
  });

  return (
    <>
      <MemoryStarField nodes={nodes} activeNode={activeNode} setActiveNode={setActiveNode} />
      <ConstellationLayer nodes={nodes} activeNode={activeNode} />
      <MemoryBloom nodes={nodes} activeNode={activeNode} bloom={bloom} />

      {/* Invisible plane to catch clicks for deselecting */}
      <mesh onClick={() => setActiveNode(null)} position={[0, 0, -10]} visible={false}>
        <planeGeometry args={[100, 100]} />
      </mesh>
    </>
  )
}
