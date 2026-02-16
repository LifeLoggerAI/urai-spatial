import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import starVertex from "@/lib/lifemap/shaders/starVertex.glsl"
import starFragment from "@/lib/lifemap/shaders/starFragment.glsl"
import { useLifeMapData, MemoryNode } from "@/lib/lifemap/useLifeMapData"

function emotionToColor(score: number) {
  if (score > 0.5) return [1.0, 0.8, 0.3] // warm gold
  if (score < -0.5) return [0.2, 0.4, 0.9] // blue
  return [1.0, 1.0, 1.0]
}

export default function Starfield({ onStarClick }: { onStarClick: (star: MemoryNode) => void }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const { nodes } = useLifeMapData()

  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3)
    const sizes = new Float32Array(nodes.length)
    const colors = new Float32Array(nodes.length * 3)

    nodes.forEach((node, i) => {
      positions[i * 3] = node.position[0]
      positions[i * 3 + 1] = node.position[1]
      positions[i * 3 + 2] = node.position[2]
      sizes[i] = node.significanceScore * 2

      const color = emotionToColor(node.emotionalScore)
      colors[i * 3] = color[0]
      colors[i * 3 + 1] = color[1]
      colors[i * 3 + 2] = color[2]
    })

    return { positions, sizes, colors }
  }, [nodes])

  useFrame(({ clock }) => {
    materialRef.current.uniforms.time.value = clock.elapsedTime
  })

  const handleClick = (event: any) => {
    // This is a simplified click handler. A real implementation would need to
    // use a raycaster to identify the clicked star.
    const clickedNode = nodes[event.index]
    onStarClick(clickedNode)
  }

  return (
    <points onPointerDown={handleClick}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={nodes.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={nodes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-color"
          count={nodes.length}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        transparent
        uniforms={{
          time: { value: 0 }
        }}
      />
    </points>
  )
}
