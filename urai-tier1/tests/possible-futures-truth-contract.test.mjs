import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { validateTruthRecord, assertRealityIsolation } from '../src/lib/truth/truthValidation.ts'
import { scenarioEntityId, scenarioMayTriggerExternalAction } from '../src/lib/scenario/scenarioPolicy.ts'
import { validateScenarioProviderResult } from '../src/lib/scenario/scenarioValidation.ts'
import { validateCouncilScenarioPerspective } from '../src/spatial/council/councilAgentSchema.ts'

const worldTypes=fs.readFileSync(new URL('../src/spatial/world/worldTypes.ts',import.meta.url),'utf8')
const destinationRegistry=fs.readFileSync(new URL('../src/spatial/world/destinationRegistry.ts',import.meta.url),'utf8')
const route=fs.readFileSync(new URL('../src/app/possible-futures/PossibleFuturesClient.tsx',import.meta.url),'utf8')
const calibration=fs.readFileSync(new URL('../../apps/functions/src/scenarioCalibration.ts',import.meta.url),'utf8')
const worldState=fs.readFileSync(new URL('../src/spatial/world/WorldStateProvider.tsx',import.meta.url),'utf8')
const transitions=fs.readFileSync(new URL('../src/spatial/world/WorldTransitionController.tsx',import.meta.url),'utf8')
const privacyOps=fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts',import.meta.url),'utf8')
const consentSurface=fs.readFileSync(new URL('../src/app/privacy-controls/ConsentSanctuaryClient.tsx',import.meta.url),'utf8')
const passportSurface=fs.readFileSync(new URL('../src/app/passport/PassportVaultClient.tsx',import.meta.url),'utf8')

test('possible futures is one canonical scenario-world destination and visibly not memory',()=>{assert.match(worldTypes,/'possible-futures'/);assert.match(worldTypes,/'scenario-world'/);assert.match(worldTypes,/UraiTruthMode = 'reality' \| 'memory' \| 'interpretation' \| 'scenario'/);assert.match(destinationRegistry,/href: '\/possible-futures'/);assert.match(route,/POSSIBLE FUTURE · NOT A MEMORY/);assert.doesNotMatch(route,/\/dream/)})
test('truth authority rejects factual high confidence without sources and scenario promotion to observation',()=>{const errors=validateTruthRecord({id:'t1',ownerId:'u1',kind:'observation',value:'x',sourceRefs:[],support:'high',userCorrectionRevision:0,createdAt:'2026-09-16T00:00:00Z',updatedAt:'2026-09-16T00:00:00Z'});assert.ok(errors.includes('HIGH_SUPPORT_REQUIRES_SOURCE'));assert.throws(()=>assertRealityIsolation('scenario','observation'),/TRUTH_PROMOTION_FORBIDDEN/)})
test('scenario provider cannot invent evidence or escape scenario namespace',()=>{const errors=validateScenarioProviderResult({branches:[{id:'br_a',label:'A',assumptionIds:[],eventIds:['sev_1'],entityStateIds:['bad'],uncertaintyIds:[],outcomeIds:[],confidence:{evidenceCoverage:'low',assumptionRisk:'low',uncertainty:'high'}}],events:[{id:'sev_1',truthKind:'scenario',relativeTime:'later',changedEntityIds:['bad'],assumptionIds:[],evidenceRefIds:['evr_invented'],mechanism:'generated-context',summary:'hypothetical',uncertaintyIds:[]}],entityStates:[{id:'bad',scenarioBranchId:'br_a',truthKind:'scenario',state:{}}],outcomes:[],uncertainties:[],evidenceRefIds:['evr_invented']},['evr_allowed']);assert.ok(errors.some((error)=>error.includes('INVENTED_EVIDENCE')));assert.ok(errors.some((error)=>error.includes('NAMESPACE_INVALID')))})
test('scenario entity ids are isolated and scenarios cannot directly trigger external actions',()=>{assert.match(scenarioEntityId('scn_one','br_a','place:home'),/^scn_one_a_/);assert.equal(scenarioMayTriggerExternalAction(),false)})
test('provider-unavailable UI exposes explicit manual scenario instead of fabricated output',()=>{assert.match(route,/Manual Scenario/);assert.match(route,/provider generation is unavailable/i);assert.match(route,/assumption-only basis/);assert.match(route,/submitManualScenarioBranchesClient/)})
test('Council scenario perspectives stay inside shared evidence and cannot fabricate consensus or authority',()=>{const errors=validateCouncilScenarioPerspective({role:'guardian',viewpoint:'x',evidenceRefIds:['outside'],support:'low',uncertaintyIds:[],assumptionsQuestioned:[],alternativeExplanations:[],consensusClaimed:false,authorityClaimed:false},{scenarioId:'scn_a',branchId:'br_a',evidenceRefIds:['allowed'],permissionReceiptIds:[]});assert.deepEqual(errors,['COUNCIL_EVIDENCE_OUTSIDE_BUNDLE:outside'])})
test('launch outcome calibration never claims predictive accuracy or updates personalization weights',()=>{assert.match(calibration,/predictiveAccuracyClaimed: false/);assert.match(calibration,/personalizationWeightsUpdated: false/)})

test('scenario travel preserves origin and cannot leak scenario truth into reality routes',()=>{
  assert.match(transitions,/context\?\.scenarioBasisRevision/)
  assert.match(transitions,/scenarioOrigin/)
  assert.match(transitions,/destinationFromOriginRealm/)
  assert.match(worldState,/action\.destination === 'possible-futures'/)
  assert.match(worldState,/\? 'scenario'/)
  assert.match(worldState,/: 'reality'/)
  assert.match(worldState,/scenarioId: action\.destination === 'possible-futures'.*: undefined/)
})

test('Possible Futures controls preserve 48px targets and reduced-motion parity',()=>{
  assert.match(route,/minHeight:48/)
  assert.match(route,/prefers-reduced-motion: reduce/)
  assert.match(route,/reducedMotion \? 0/)
})

test('Possible Futures and AI ledger participate in explicit owner export and deletion rights',()=>{
  assert.match(privacyOps,/EXPORT_SCOPES[^\n]*'intelligence'/)
  assert.match(privacyOps,/scopes\.includes\('intelligence'\)/)
  assert.match(privacyOps,/data\.scenarios/)
  assert.match(privacyOps,/data\.aiLedger/)
  assert.match(privacyOps,/intelligence: \['scenarios', 'aiLedger'\]/)
  assert.match(privacyOps,/'all-repository-data': \[[\s\S]*'scenarios'[\s\S]*'aiLedger'/)
  assert.match(consentSurface,/EXPORT_SCOPES[^\n]*'life-model'[^\n]*'intelligence'/)
  assert.match(consentSurface,/Possible Futures and AI activity ledger/)
  assert.match(passportSurface,/Possible Futures and AI activity ledger/)
})
