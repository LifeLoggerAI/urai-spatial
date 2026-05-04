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