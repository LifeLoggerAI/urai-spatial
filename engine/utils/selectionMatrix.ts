import * as THREE from 'three'

export function applySelectionScale(
  baseMatrix: THREE.Matrix4,
  isSelected: boolean
) {
  const matrix = baseMatrix.clone()
  if (isSelected) {
    const scale = new THREE.Matrix4().makeScale(1.6, 1.6, 1.6)
    matrix.multiply(scale)
  }
  return matrix
}
