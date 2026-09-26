import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { applyProps } from '@react-three/fiber'
import { PerspectiveCamera, Sprite, SpriteMaterial, Vector3 } from 'three'
import { focusPlasmaSample, makeFocusPlasmaTexture, makeFocusMemoryMask, focusMediaSize } from '../src/app/focus/focusStellarTexture.ts'
import { loadFocusSourceMedia } from '../src/app/focus/focusSourceMedia.ts'
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
  assert.equal(sprites.length, 4, 'all four authored stellar layers must be exercised')
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
    const radius = 1.60 / 2 * .98 * 2.08 * 1.01
    for (let step = 0; step < 64; step++) {
      const angle = step / 64 * Math.PI * 2
      const edge = new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, FOCUS_STAR_TARGET[2] + .18 * 2.08).project(camera)
      assert.ok(Math.abs(edge.x) < .95 && Math.abs(edge.y) < .95, `Photosphere clipped at ${width}x${height}`)
    }
    assert.ok(camera.position.distanceTo(new Vector3(...FOCUS_STAR_TARGET)) < focusCameraMaxRadius(aspect), 'OrbitControls must not clamp the responsive initial position')
  }
})


test('photosphere density fades continuously instead of an opaque disk or empty annulus', () => {
  const average = radius => Array.from({ length: 96 }, (_, i) => {
    const angle = i / 96 * Math.PI * 2
    return focusPlasmaSample(Math.cos(angle) * radius, Math.sin(angle) * radius).alpha
  }).reduce((a, b) => a + b, 0) / 96
  const samples = [0, .15, .3, .45, .6, .75, .9, 1].map(average)
  assert.ok(samples[0] > .8, 'the luminous center must remain populated')
  for (let i = 1; i < samples.length; i++) assert.ok(samples[i] < samples[i - 1], 'the photosphere must soften outward without a bright ring')
  assert.ok(samples[4] < .15, 'the former broad opaque disk must not survive')
  assert.equal(samples.at(-1), 0)
  let previous = focusPlasmaSample(0, 0).alpha
  for (let i = 1; i <= 1000; i++) {
    const next = focusPlasmaSample(i / 1000, 0).alpha
    assert.ok(Math.abs(next - previous) < .035, 'no hard circular silhouette')
    previous = next
  }
})

test('runtime plasma texture is deterministic, feathered, and has bounded allocation', () => {
  const first = makeFocusPlasmaTexture(), second = makeFocusPlasmaTexture()
  try {
    assert.equal(first.image.data.length, 512 * 512 * 4)
    assert.deepEqual(first.image.data, second.image.data)
    for (let i = 0; i < 512; i++) {
      assert.equal(first.image.data[i * 4 + 3], 0)
      assert.equal(first.image.data[(511 * 512 + i) * 4 + 3], 0)
    }
    assert.ok(first.image.data[(256 * 512 + 256) * 4 + 3] > 200)
  } finally { first.dispose(); second.dispose() }
})

test('source memory sizing preserves its native aspect across landscape, portrait and panoramic media', () => {
  for (const [width, height] of [[4000, 3000], [1080, 1920], [8000, 1000], [1200, 1200]]) {
    const [x, y] = focusMediaSize(width, height)
    assert.ok(Math.abs(x / y - width / height) < 1e-10)
    assert.ok(Math.max(x, y) <= .740001)
  }
  for (const invalid of [[0, 100], [Infinity, 100], [100, NaN], [-1, 2]]) assert.deepEqual(focusMediaSize(...invalid), [0, 0, 1])
})

test('source mask keeps native-image center intact and feathers every boundary', () => {
  const mask = makeFocusMemoryMask()
  try {
    const data = mask.image.data
    assert.equal(data[(64 * 128 + 64) * 4 + 1], 255)
    for (let i = 0; i < 128; i++) {
      assert.ok(data[i * 4 + 1] <= 1)
      assert.ok(data[(127 * 128 + i) * 4 + 1] <= 1)
      assert.ok(data[(i * 128) * 4 + 1] <= 1)
      assert.ok(data[(i * 128 + 127) * 4 + 1] <= 1)
    }
  } finally { mask.dispose() }
})

function withMediaElements(run) {
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const images = [], videos = []
  class FakeImage {
    naturalWidth = 1920
    naturalHeight = 1080
    src = ''
    constructor() { images.push(this) }
    removeAttribute(name) { if (name === 'src') this.src = '' }
  }
  class FakeVideo {
    videoWidth = 1080
    videoHeight = 1920
    loads = 0
    pauses = 0
    plays = 0
    src = ''
    constructor() { videos.push(this) }
    load() { this.loads++ }
    pause() { this.pauses++ }
    play() { this.plays++; throw new Error('Focus source must remain a still') }
    removeAttribute(name) { if (name === 'src') this.src = '' }
  }
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: FakeImage })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: tag => { assert.equal(tag, 'video'); return new FakeVideo() } } })
  try { run({ images, videos }) } finally {
    if (previousImage) Object.defineProperty(globalThis, 'Image', previousImage); else delete globalThis.Image
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document
  }
}

test('cancelled private image callbacks cannot restore a previous selected memory', () => withMediaElements(({ images }) => {
  const layers = [], states = []
  const stop = loadFocusSourceMedia({ kind: 'image', url: 'https://fixture.invalid/private-old' }, layer => layers.push(layer), state => states.push(state))
  const lateLoad = images[0].onload, lateError = images[0].onerror
  stop()
  lateLoad(); lateError()
  assert.equal(images[0].src, '')
  assert.equal(images[0].onload, null)
  assert.deepEqual(layers, [])
  assert.deepEqual(states, ['loading'])
}))

test('loaded authorized image preserves aspect and disposes its texture on release', () => withMediaElements(({ images }) => {
  let layer
  const states = []
  const stop = loadFocusSourceMedia({ kind: 'image', url: 'https://fixture.invalid/private-current' }, value => { layer = value }, state => states.push(state))
  images[0].onload()
  assert.equal(images[0].crossOrigin, 'anonymous')
  assert.ok(Math.abs(layer.size[0] / layer.size[1] - 16 / 9) < 1e-10)
  let disposed = 0
  layer.texture.addEventListener('dispose', () => disposed++)
  stop(); stop()
  assert.equal(disposed, 1)
  assert.deepEqual(states, ['loading', 'ready'])
}))

test('source video remains muted paused imagery and detaches on memory departure', () => withMediaElements(({ videos }) => {
  let layer
  const states = []
  const stop = loadFocusSourceMedia({ kind: 'video', url: 'https://fixture.invalid/authorized-video' }, value => { layer = value }, state => states.push(state))
  const lateFrame = videos[0].onloadeddata
  lateFrame()
  assert.equal(layer.texture.isVideoTexture, true)
  assert.equal(videos[0].muted, true)
  assert.equal(videos[0].plays, 0)
  assert.ok(layer.size[1] > layer.size[0])
  let disposed = 0
  layer.texture.addEventListener('dispose', () => disposed++)
  stop()
  lateFrame()
  assert.equal(disposed, 1)
  assert.equal(videos[0].src, '')
  assert.equal(videos[0].pauses, 1)
  assert.deepEqual(states, ['loading', 'ready'])
}))

test('failed or dimensionless sources stay unavailable and never substitute generated media', () => withMediaElements(({ images }) => {
  for (const failure of ['error', 'zero-size']) {
    const layers = [], states = []
    const stop = loadFocusSourceMedia({ kind: 'image', url: 'https://fixture.invalid/failing' }, value => layers.push(value), state => states.push(state))
    const image = images.at(-1)
    if (failure === 'error') image.onerror()
    else { image.naturalWidth = 0; image.onload() }
    assert.deepEqual(states, ['loading', 'unavailable'])
    assert.deepEqual(layers, [null])
    stop()
  }
}))
