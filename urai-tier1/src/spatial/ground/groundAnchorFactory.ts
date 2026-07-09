import { createGroundAnchor, type GroundLifeAnchor } from './groundLifeAnchors'

export function createGroundWorldObjects(anchors: GroundLifeAnchor[]) {
  return anchors.map((anchor) => createGroundAnchor(anchor))
}

export function createExampleLifeAnchors() {
  return createGroundWorldObjects([
    {
      id: 'home-routine',
      kind: 'routine',
      title: 'Daily rhythm',
      vitality: 0.8,
      position: [0, 0, 0],
    },
    {
      id: 'relationship-circle',
      kind: 'relationship',
      title: 'People who matter',
      vitality: 0.7,
      position: [5, 0, -4],
    },
  ])
}
