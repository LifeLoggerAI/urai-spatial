import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const tier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicIcon = path.join(tier, 'public/icon.svg')
const appIcon = path.join(tier, 'src/app/icon.svg')
const layout = path.join(tier, 'src/app/layout.tsx')

test('unchanged original UrAi SVG is served statically without generated app metadata route', () => {
  assert.equal(existsSync(appIcon), false, 'generated /icon.svg app route must not exist')
  assert.ok(existsSync(publicIcon), 'static public/icon.svg is required')
  const content = readFileSync(publicIcon)
  const hash = createHash('sha1').update('blob ' + content.length + String.fromCharCode(0)).update(content).digest('hex')
  assert.equal(hash, '7938a8c830261025ec2e1f79b982da5c8225c46e')
})

test('root HTML metadata points the icon link at the same public URL', () => {
  const source = readFileSync(layout, 'utf8')
  assert.ok(source.includes("icon: '/icon.svg'"))
  assert.ok(!source.includes('icon: embeddedIcon'))
})
