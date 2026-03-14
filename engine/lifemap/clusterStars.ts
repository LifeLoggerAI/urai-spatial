import { lifeDataset } from "./lifeDataset"

export type Cluster = {
  id: number
  stars: number[]
  center: [number, number, number]
}

export function generateClusters(clusterCount = 25): Cluster[] {

  const clusters: Cluster[] = []

  if (lifeDataset.length === 0) return clusters

  const size = Math.ceil(lifeDataset.length / clusterCount)

  for (let i = 0; i < clusterCount; i++) {

    const start = i * size
    const end = Math.min(start + size, lifeDataset.length)

    const slice = lifeDataset.slice(start, end)

    if (slice.length === 0) continue

    let cx = 0
    let cy = 0
    let cz = 0

    slice.forEach(s => {
      cx += s.position[0]
      cy += s.position[1]
      cz += s.position[2]
    })

    cx /= slice.length
    cy /= slice.length
    cz /= slice.length

    clusters.push({
      id: i,
      stars: slice.map(s => s.id),
      center: [cx, cy, cz]
    })

  }

  return clusters
}