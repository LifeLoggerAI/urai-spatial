import { lifeDataset } from "./lifeDataset"

export type Cluster = {
  id: number
  stars: number[]
  center: [number, number, number]
}

function distance(
  a: [number, number, number],
  b: [number, number, number]
) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

export function generateClusters(clusterCount = 25): Cluster[] {

  if (lifeDataset.length === 0) return []

  const centers: [number, number, number][] = []
  const step = Math.floor(lifeDataset.length / clusterCount)

  for (let i = 0; i < clusterCount; i++) {
    const star = lifeDataset[i * step]
    centers.push([
      star.position[0],
      star.position[1],
      star.position[2]
    ])
  }

  const clusterStars: number[][] = Array.from(
    { length: clusterCount },
    () => []
  )

  lifeDataset.forEach(star => {

    let best = 0
    let bestDist = Infinity

    for (let i = 0; i < centers.length; i++) {
      const d = distance(star.position, centers[i])
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }

    clusterStars[best].push(star.id)

  })

  const clusters: Cluster[] = []

  for (let i = 0; i < clusterCount; i++) {

    const ids = clusterStars[i]

    if (ids.length === 0) continue

    let cx = 0
    let cy = 0
    let cz = 0

    ids.forEach(id => {
      const star = lifeDataset.find(s => s.id === id)!
      cx += star.position[0]
      cy += star.position[1]
      cz += star.position[2]
    })

    cx /= ids.length
    cy /= ids.length
    cz /= ids.length

    clusters.push({
      id: i,
      stars: ids,
      center: [cx, cy, cz]
    })

  }

  return clusters
}