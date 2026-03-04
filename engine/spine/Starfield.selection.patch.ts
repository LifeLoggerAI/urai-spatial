// This file intentionally left as marker.
// Starfield.tsx must:
// - NOT regenerate geometry
// - NOT recreate instancedMesh
// - Read selectedStarId from useSpatialStore
// - On pointer down:
//     setSelectedStar(index)
// - Use instanceMatrix.setMatrixAt for scale
// - Use instanceColor attribute for dimming
