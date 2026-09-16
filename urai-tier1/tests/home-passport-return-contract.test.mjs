import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const state = fs.readFileSync(new URL('../src/spatial/home/homeExperienceState.ts', import.meta.url), 'utf8')
const controller = fs.readFileSync(new URL('../src/spatial/home/useHomeExperienceController.ts', import.meta.url), 'utf8')
const homeRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')

test('Passport captures exact first-person Home origin before world travel', () => {
  assert.ok(state.includes("HOME_PASSPORT_ORIGIN_CAPTURE_EVENT = 'urai:home-passport-origin-capture'"))
  assert.ok(state.includes("export type HomeReturnDestination = HomeDestination | 'PASSPORT'"))
  assert.ok(homeRepair.includes('HOME_PASSPORT_ORIGIN_CAPTURE_EVENT'))
  assert.ok(homeRepair.includes('window.dispatchEvent(new Event(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT))'))
  assert.ok(controller.includes("destination: 'PASSPORT'"))
  assert.ok(controller.includes('origin: currentOrigin()'))
  assert.ok(controller.includes("state.stableState !== 'AVATAR_HOME_FIRST_PERSON'"))
})

test('Passport return restores Home origin without masquerading as Ground or Life Map unwind', () => {
  assert.ok(state.includes("parsed.destination !== 'PASSPORT'"))
  assert.ok(state.includes("event.destination === 'LIFE_MAP'"))
  assert.ok(state.includes(": 'HOME_RESTORE'"))
  assert.ok(controller.includes("dispatch({ type: 'DESTINATION_RETURN', destination: returned.destination, snapshot: returned.origin })"))
})

test('Passport does not widen the existing Ground/Life Map destination commit contract', () => {
  assert.ok(state.includes("export type HomeDestination = 'GROUND' | 'LIFE_MAP'"))
  assert.ok(controller.includes('onDestinationCommit: (destination: HomeDestination'))
})
