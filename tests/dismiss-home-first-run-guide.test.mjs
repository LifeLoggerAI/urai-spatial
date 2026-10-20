import assert from 'node:assert/strict'
import test from 'node:test'
import { dismissHomeFirstRunGuide } from '../scripts/dismiss-home-first-run-guide.mjs'

function fixture({ automatic = true, focusable = true, persist = true, detach = true } = {}) {
  let visible = true
  let completed = false
  const events = []
  const skip = {
    waitFor: async ({ state }) => { assert.equal(state, 'visible'); assert.equal(visible, true) },
    focus: async () => { events.push('focus') },
    evaluate: async () => focusable,
  }
  const guide = {
    waitFor: async ({ state }) => {
      events.push('wait:' + state)
      if (state === 'visible') assert.equal(visible, true)
      else if (state === 'detached') {
        if (!detach || visible) throw new Error('Guide did not detach')
      }
    },
    count: async () => 1,
    getAttribute: async () => automatic ? 'automatic' : 'guided',
    getByRole: (role, options) => {
      assert.deepEqual([role, options.name, options.exact], ['button', 'Skip', true])
      return skip
    },
  }
  return { events, page: {
    locator: (selector) => { assert.equal(selector, 'aside.uraiV2OnboardingCard[data-home-guide="true"]'); return guide },
    keyboard: { press: async key => {
      events.push('key:' + key)
      assert.equal(key, 'Enter')
      visible = !detach
      completed = persist
    } },
    evaluate: async () => completed,
  } }
}

test('actual automatic Home first-run guide is keyboard-dismissed and persisted before clear-world proof', async () => {
  const f = fixture()
  const receipt = await dismissHomeFirstRunGuide(f.page)
  assert.deepEqual(receipt, { guide: 'automatic-home-first-run', input: 'native-keyboard-enter', dismissed: true, completionPersisted: true })
  assert.deepEqual(f.events, ['wait:visible', 'focus', 'key:Enter', 'wait:detached'])
})

test('explicit guided onboarding is never silently dismissed by visual proof', async () => {
  await assert.rejects(dismissHomeFirstRunGuide(fixture({ automatic: false }).page), /automatic Home first-run guide/)
})
test('inaccessible Skip cannot produce clear-world proof', async () => {
  await assert.rejects(dismissHomeFirstRunGuide(fixture({ focusable: false }).page), /receive keyboard focus/)
})
test('unpersisted dismissal cannot produce clear-world proof', async () => {
  await assert.rejects(dismissHomeFirstRunGuide(fixture({ persist: false }).page), /did not persist/)
})
test('guide still covering the canvas cannot pass', async () => {
  await assert.rejects(dismissHomeFirstRunGuide(fixture({ detach: false }).page), /did not detach/)
})
test('deadlines cannot be disabled or extended arbitrarily', async () => {
  const f = fixture()
  for (const timeout of [0, 20_001, Number.NaN, 1.5]) await assert.rejects(dismissHomeFirstRunGuide(f.page, timeout), /bounded deadline/)
})
