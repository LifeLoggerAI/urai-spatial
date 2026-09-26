import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')

test('history preview starts with no selected source category', () => {
  assert.ok(source.includes("useState<GoogleHistoryCategory[]>([])"))
  assert.ok(source.includes("googleHistoryCategories.length === 0"))
  assert.ok(source.includes("confirmPreview: true"))
  assert.ok(source.includes("categories: googleHistoryCategories"))
})

test('history preview explains metadata-only boundaries', () => {
  assert.ok(source.includes("no message bodies or subjects"))
  assert.ok(source.includes("no titles, attendees, locations or descriptions are saved"))
  assert.ok(source.includes("no names or addresses are saved"))
  assert.ok(source.includes("not all Drive history"))
})

test('history preview keeps downstream memory admission off', () => {
  assert.ok(source.includes("value={90}"))
  assert.ok(source.includes("value={365}"))
  assert.ok(source.includes("value={1095}"))
  assert.ok(source.includes("value={3650}"))
  assert.ok(source.includes("Raw items persisted:"))
  assert.ok(source.includes("Memory admission: off"))
  assert.ok(source.includes("explicit import and use decision is still required"))
})
