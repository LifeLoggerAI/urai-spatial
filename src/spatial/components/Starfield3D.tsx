  const threads = useMemo(() => {
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = []

    nodes
      .filter((n) => n.kind === 'major')
      .forEach((n) => {
        n.connectedTo.forEach((toId) => {
          const to = nodeMap.get(toId)
          if (!to) return
          if (n.id < to.id) pairs.push([n.position, to.position])
        })
      })

    return pairs
  }, [nodeMap, nodes])

  useFrame((_, dt) => {
    if (!group.current || !starGroup.current) return

    const clampedNear = Math.max(0.08, Math.min(0.25, cameraNear ?? 0.1))
    const clampedFar = Math.max(80, Math.min(220, cameraFar ?? 150))
    const minZ = -clampedFar + 6
    const maxZ = -clampedNear - 0.4

    let speed = 0

    if (phase === 'ASCENT') speed = 10 + streakIntensity * 14
    else if (phase === 'LIFEMAP') speed = 0.5
    else if (phase === 'FOCUS') speed = 0
    else if (phase === 'REPLAY') speed = 2

    group.current.position.y = Math.max(-1.5, Math.min(1.5, (cameraY ?? 0.8) - 0.8))
    group.current.rotation.z += dt * 0.004

    starGroup.current.children.forEach((child: THREE.Object3D, index) => {
      child.position.z += dt * speed * (1 + nebulaReveal * 0.2) * (1 + streakIntensity * 0.15)

      if (child.position.z > maxZ || child.position.z > 5) {
        child.position.z = Math.max(minZ, nodes[index]?.respawnZ ?? -90)
      }

      if (child.position.z < minZ - 10) {
        child.position.z = minZ
      }
    })
  })