import fs from 'node:fs'

const path = 'scripts/one-shot-final-lifemap-deterministic-repair.mjs'
const source = fs.readFileSync(path, 'utf8')
const lines = source.split('\n')
let replacements = 0

const next = lines.map((line) => {
  if (line.includes('assert.match(source, /key={\\\\`memory-main-')) {
    replacements += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-main-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-left-')) {
    replacements += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-left-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-right-')) {
    replacements += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-right-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  return line
}).join('\n')

if (replacements !== 3) throw new Error(`Expected three nested-template assertions; replaced ${replacements}`)
fs.writeFileSync(path, next)
console.log('Normalized three nested-template assertions in the bounded repair generator.')
