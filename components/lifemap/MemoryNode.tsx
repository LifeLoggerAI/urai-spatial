import { Billboard, Html, Text } from "@react-three/drei"

export default function MemoryNode({
  node,
  isSelected,
  onClick
}: {
  node: any
  isSelected: boolean
  onClick: () => void
}) {
  const color = new THREE.Color(
    node.color.r, // Assuming color is { r, g, b }
    node.color.g,
    node.color.b
  )

  return (
    <group position={node.spiralPosition} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[node.size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Billboard>
        <Text fontSize={1} color="white">
          {node.name}
        </Text>
      </Billboard>
      {isSelected && (
        <Html>
          <div className="memory-node-tooltip">
            <p>{node.summary}</p>
          </div>
        </Html>
      )}
    </group>
  )
}
