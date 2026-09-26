import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { applyProps } from '@react-three/fiber'
import { PerspectiveCamera, Sprite, SpriteMaterial, Vector3 } from 'three'
import { focusCameraPosition, focusCameraMaxRadius, FOCUS_STAR_TARGET } from '../src/app/focus/focusCameraFraming.ts'

const source = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('FocusChamberClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const sprites = []
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'sprite') sprites.push(node)
  ts.forEachChild(node, visit)
}
visit(ast)

function numeric(node) {
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -numeric(node.operand)
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(numeric)
  throw new Error(`Unexpected transform expression: ${node.getText(ast)}`)
}
function transforms(attributes) {
  const result = {}
  for (const attribute of attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || !['position', 'scale', 'rotation'].includes(attribute.name.text)) continue
    assert.ok(attribute.initializer && ts.isJsxExpression(attribute.initializer))
    result[attribute.name.text] = numeric(attribute.initializer.expression)
  }
  return result
}

test('actual Focus photosphere and corona props produce finite visible Three.js sprites', () => {
  assert.equal(sprites.length, 3, 'all three authored stellar layers must be exercised')
  const camera = new PerspectiveCamera(44, 16 / 9, .08, 120)
  camera.position.set(0, .08, 3.55)
  camera.lookAt(0, 0, -1.05)
  camera.updateMatrixWorld(true)
  for (const element of sprites) {
    const materialElement = element.children.find(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText(ast) === 'spriteMaterial')
    assert.ok(materialElement)
    const material = new SpriteMaterial()
    const sprite = new Sprite(material)
    try {
      applyProps(sprite, transforms(element.openingElement.attributes))
      applyProps(material, transforms(materialElement.attributes))
      sprite.updateMatrixWorld(true)
      assert.ok(sprite.matrixWorld.elements.every(Number.isFinite), `${element.openingElement.getText(ast)} has a non-finite world matrix`)
      assert.ok(Number.isFinite(material.rotation), 'billboard rotation must be finite')
      const projected = new Vector3().setFromMatrixPosition(sprite.matrixWorld).project(camera)
      assert.ok([projected.x, projected.y, projected.z].every(Number.isFinite))
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1, 'stellar layer center must be in the camera frustum')
    } finally {
      material.dispose()
    }
  }
})

test('default stellar photosphere stays inside portrait, landscape and ultrawide viewports', () => {
  for (const [width, height] of [[320, 900], [390, 844], [768, 1024], [1024, 768], [844, 390], [1440, 810], [2560, 1080]]) {
    const aspect = width / height
    const camera = new PerspectiveCamera(44, aspect, .08, 120)
    camera.position.set(...focusCameraPosition(aspect))
    camera.lookAt(...FOCUS_STAR_TARGET)
    camera.updateMatrixWorld(true)
    // Largest authored photosphere radius, including the breathing envelope.
    const radius = 1.86 / 2 * .76 * 2.08 * 1.01
    for (let step = 0; step < 64; step++) {
      const angle = step / 64 * Math.PI * 2
      const edge = new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, FOCUS_STAR_TARGET[2] + .18 * 2.08).project(camera)
      assert.ok(Math.abs(edge.x) < .95 && Math.abs(edge.y) < .95, `Photosphere clipped at ${width}x${height}`)
    }
    assert.ok(camera.position.distanceTo(new Vector3(...FOCUS_STAR_TARGET)) < focusCameraMaxRadius(aspect), 'OrbitControls must not clamp the responsive initial position')
  }
})
