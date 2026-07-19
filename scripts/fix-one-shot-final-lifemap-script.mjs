import fs from 'node:fs'

const path = 'scripts/one-shot-final-lifemap-deterministic-repair.mjs'
const source = fs.readFileSync(path, 'utf8')
const lines = source.split('\n')
let templateAssertions = 0
let readinessExpression = 0

const next = lines.map((line) => {
  if (line.includes('assert.match(source, /key={\\\\`memory-main-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-main-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-left-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-left-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-right-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-right-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('const visualGenerationKey = \\`${webglState}:')) {
    readinessExpression += 1
    return line.replace('${webglState}', '\\${webglState}')
  }
  return line
}).join('\n')

if (templateAssertions !== 3) throw new Error(`Expected three nested-template assertions; replaced ${templateAssertions}`)
if (readinessExpression !== 1) throw new Error(`Expected one generated readiness expression; replaced ${readinessExpression}`)
fs.writeFileSync(path, next)
console.log('Normalized nested assertions and preserved the generated readiness expression.')
