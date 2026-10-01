#!/usr/bin/env node
import fs from 'node:fs'

const inputPath = process.argv[2]
if (!inputPath) throw new Error('usage: validate-interpretive-world-visual-acceptance.mjs <receipt.json>')
const receipt = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const failures = []
const need = (ok, message) => { if (!ok) failures.push(message) }

const classifications = new Set(['PENDING_LITERAL_REVIEW', 'PARTIAL_REVIEW', 'REJECTED', 'ACCEPTED'])
const statuses = new Set(['pending', 'accepted', 'rejected'])
const taskIdPattern = /^[0-9a-f-]{36}$/i

need(receipt?.schemaVersion === 'urai-interpretive-world-visual-acceptance-1', 'supported visual acceptance schemaVersion required')
need(receipt?.worldId === 'URAI-IW-001-QUIET-RESET', 'World 001 visual receipt required')
need(receipt?.truthClass === 'interpretive', 'visual receipt truthClass must remain interpretive')
need(receipt?.autobiographical === false, 'visual receipt cannot claim autobiography')
need(classifications.has(receipt?.classification), 'recognized visual review classification required')
need(typeof receipt?.review?.overallAccepted === 'boolean', 'review.overallAccepted boolean required')
need(typeof receipt?.review?.geometryConsistencyAccepted === 'boolean', 'review.geometryConsistencyAccepted boolean required')
need(Array.isArray(receipt?.items) && receipt.items.length === 12, 'exact 12 generated items required: hero + 3 anchors + 8 surveys')

const items = Array.isArray(receipt?.items) ? receipt.items : []
const taskIds = items.map((item) => item?.taskId)
need(items.every((item) => typeof item?.id === 'string' && item.id.trim() && taskIdPattern.test(item?.taskId) && statuses.has(item?.status)), 'every visual item requires id, Runway taskId and review status')
need(new Set(taskIds).size === taskIds.length, 'visual task IDs must be unique')
need(items.filter((item) => item.role === 'hero').length === 1, 'exactly one hero item required')
need(items.filter((item) => item.role === 'anchor').length === 3, 'exactly three anchor items required')
need(items.filter((item) => item.role === 'survey').length === 8, 'exactly eight survey items required')

const pending = items.filter((item) => item.status === 'pending').length
const accepted = items.filter((item) => item.status === 'accepted').length
const rejected = items.filter((item) => item.status === 'rejected').length
const reviewerValid = typeof receipt?.review?.reviewer === 'string' && receipt.review.reviewer.trim().length > 0
const reviewedAtValid = Number.isFinite(Date.parse(receipt?.review?.reviewedAt))

if (receipt?.classification === 'PENDING_LITERAL_REVIEW') {
  need(pending === 12 && accepted === 0 && rejected === 0, 'pending classification requires all 12 items pending')
  need(receipt.review.overallAccepted === false, 'pending review cannot be overall accepted')
  need(receipt.review.geometryConsistencyAccepted === false, 'pending review cannot accept geometry consistency')
}

if (receipt?.classification === 'PARTIAL_REVIEW') {
  need(pending > 0 && (accepted > 0 || rejected > 0), 'partial review requires reviewed and pending items')
  need(receipt.review.overallAccepted === false, 'partial review cannot be overall accepted')
}

if (receipt?.classification === 'REJECTED') {
  need(rejected > 0, 'rejected classification requires at least one rejected item')
  need(receipt.review.overallAccepted === false, 'rejected review cannot be overall accepted')
  need(reviewerValid && reviewedAtValid, 'rejected review requires reviewer and reviewedAt')
}

if (receipt?.classification === 'ACCEPTED') {
  need(accepted === 12 && pending === 0 && rejected === 0, 'accepted classification requires all 12 items accepted')
  need(receipt.review.overallAccepted === true, 'accepted classification requires overallAccepted=true')
  need(receipt.review.geometryConsistencyAccepted === true, 'accepted classification requires geometry consistency acceptance')
  need(reviewerValid && reviewedAtValid, 'accepted review requires reviewer and reviewedAt')
}

if (receipt?.classification !== 'ACCEPTED') {
  need(!/(visual accepted|geometry accepted|reconstruction accepted|runtime ready|launch ready)/i.test(String(receipt?.allowedClaim ?? '')), 'non-accepted visual receipt overstates readiness')
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  schemaVersion: receipt.schemaVersion,
  classification: receipt.classification,
  counts: { pending, accepted, rejected },
}, null, 2))
