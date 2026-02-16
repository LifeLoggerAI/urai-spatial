export function aggregateNodes(nodes) {
  const buckets = {}

  nodes.forEach(node => {
    const key = Math.floor(node.timestamp / 31536000000) // yearly
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(node)
  })

  return Object.values(buckets).map(group => ({
    x: group[0].x,
    y: group[0].y,
    z: group[0].z,
    size: group.length * 0.3
  }))
}
