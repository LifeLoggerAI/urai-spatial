import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  buildCouncilSecondOpinionPrompt,
  requestCouncilSecondOpinion,
} from '../src/spatial/council/councilSecondOpinion.ts'

const fake = (overrides = {}) => ({
  originalProvider: 'openai',
  reviewerProvider: 'gemini',
  originalQuestion: 'Fictional cousin: which person is a cousin, not a sibling?',
  firstAnswer: 'Person X may be a cousin.',
  context: Array.from({ length: 12 }, (_, i) => ({ role: 'user', content: 'fictional turn '+i })),
  explicitSecondProviderConsent: true,
  signal: new AbortController().signal,
  ...overrides,
})

test('separate review consent is required before ANY provider dispatch', async () => {
  let calls = 0
  const dispatch = async () => { calls += 1; throw new Error('MUST_NOT_CALL') }
  assert.equal(await requestCouncilSecondOpinion(fake({ explicitSecondProviderConsent: false }), dispatch), null)
  const controller = new AbortController()
  controller.abort()
  assert.equal(await requestCouncilSecondOpinion(fake({ signal: controller.signal }), dispatch), null)
  assert.equal(calls, 0)
})

test('the reviewer must be a different provider and bounds are enforced', async () => {
  await assert.rejects(requestCouncilSecondOpinion(fake({ reviewerProvider:'openai' }), async()=>null), /COUNCIL_REVIEW_PROVIDER_MUST_DIFFER/)
  assert.throws(()=>buildCouncilSecondOpinionPrompt('hello', 'x'.repeat(1601)),/COUNCIL_REVIEW_INPUT_BOUNDS/)
  assert.throws(()=>buildCouncilSecondOpinionPrompt(' ', 'valid'),/COUNCIL_REVIEW_INPUT_BOUNDS/)
  assert.throws(()=>buildCouncilSecondOpinionPrompt('Q'.repeat(1500), 'A'.repeat(700)),/COUNCIL_REVIEW_INPUT_BOUNDS/)
})

test('the actual provider dispatch contract uses the chosen reviewer and bounded, consented context', async () => {
  let requests = []
  const dispatch = async req => {
    requests.push(req)
    return { provider: req.provider, message: 'Synthetic second opinion; no verified correction.', disclosure: 'Synthetic', caption: 'Synthetic', model: 'synthetic-provider' }
  }
  const input = fake()
  const result = await requestCouncilSecondOpinion(input, dispatch)
  assert.equal(result.provider, 'gemini')
  assert.equal(requests.length,1)
  assert.equal(requests[0].provider,'gemini')
  assert.equal(requests[0].aiProcessingConsent,true)
  assert.deepEqual(requests[0].context, input.context.slice(-8))
  assert.equal(requests[0].signal,input.signal)
  assert.match(requests[0].message,/FIRST RESPONSE FROM ANOTHER PROVIDER/)
  assert.match(requests[0].message,/Identify any specific contradictions/)
  assert.match(requests[0].message,/Do not replace the original answer automatically/)
})

test('blocked provider, mismatched provider and revoked actor fail closed', async () => {
  assert.equal(await requestCouncilSecondOpinion(fake(), async()=>null),null)
  await assert.rejects(requestCouncilSecondOpinion(fake(),async()=>({provider:'openai',message:'wrong'})),/COUNCIL_REVIEW_PROVIDER_MISMATCH/)
  const controller=new AbortController()
  const result=await requestCouncilSecondOpinion(fake({signal:controller.signal}), async req=>{
    controller.abort()
    return {provider:req.provider,message:'Synthetic stale answer'}
  })
  assert.equal(result,null)
})

test('provider failure propagates without replacing a valid primary answer', async () => {
  await assert.rejects(requestCouncilSecondOpinion(fake(),async()=>{throw new Error('SYNTHETIC_PROVIDER_FAILURE')}),/SYNTHETIC_PROVIDER_FAILURE/)
})

test('Council panel exposes independently consented second opinion; no automatic answer substitution', () => {
  const panel=fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx',import.meta.url),'utf8')
  assert.match(panel,/requestCouncilSecondOpinion\(/)
  assert.match(panel,/setReviewResult\(review\)/)
  assert.match(panel,/setReviewConsent\(false\)/)
  assert.match(panel,/No automatic correction/)
  assert.match(panel,/Allow .* to review the original question, bounded Council context, and first provider answer/)
  assert.doesNotMatch(panel,/setResult\(review\)/)
})
