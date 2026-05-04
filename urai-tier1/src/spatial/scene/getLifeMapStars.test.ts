import { strict as assert } from 'node:assert'
import { getLifeMapStars } from '@/spatial/scene/getLifeMapStars'

function validate() {
  const { stars } = getLifeMapStars()
  const major = stars.filter((star) => star.major)
  const background = stars.filter((star) => !star.major)

  assert.ok(major.length >= 6 && major.length <= 12, `major stars out of range: ${major.length}`)
  assert.ok(background.length >= 30 && background.length <= 80, `background stars out of range: ${background.length}`)
  assert.ok(major.length > 0, 'major-star set must be non-empty')

  const toneSet = new Set(major.map((star) => star.tone))
  assert.ok(toneSet.size >= 4, `tone diversity too low: ${toneSet.size}`)

  const namedMajors = major.filter((star) => (star.title ?? '').trim().length > 0)
  assert.equal(namedMajors.length, major.length, 'every major star should have a label/title')
}

validate()
