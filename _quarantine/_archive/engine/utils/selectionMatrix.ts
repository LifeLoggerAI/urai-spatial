import * as THREE from 'three'

const SCALE_MATRIX = new THREE.Matrix4().makeScale(1.6, 1.6, 1.6)

export function applySelectionScale(
  baseMatrix: THREE.Matrix4,
  isSelected: boolean
): THREE.Matrix4 {

  if (!isSelected) {
    return baseMatrix
  }

  const matrix = baseMatrix.clone()
  matrix.multiply(SCALE_MATRIX)

  return matrix
}