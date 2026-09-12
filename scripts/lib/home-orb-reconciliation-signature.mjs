const EXPECTED_FAILURE = 'locator.click: Timeout 30000ms exceeded.'
const EXPECTED_CONTROL = "getByRole('button', { name: 'Open URAI Orb companion' })"

export function assertExactHomeOrbOpenTransportFailure({ failure, exactHead }) {
  if (failure?.exactHead !== exactHead) throw new Error(`failure evidence SHA mismatch: ${failure?.exactHead ?? 'missing'} != ${exactHead}`)
  if (failure?.failingRecord?.id !== 'orb-lifecycle-production-ui') throw new Error('reconciliation is only valid for production Orb lifecycle')
  if (!Array.isArray(failure?.failingRecord?.pageErrors) || failure.failingRecord.pageErrors.length !== 0) throw new Error('original failure included page errors')
  if (!Array.isArray(failure?.failingRecord?.providerBoundaryRequests) || failure.failingRecord.providerBoundaryRequests.length !== 0) throw new Error('original failure crossed provider boundary')

  const predicate = String(failure?.failedPredicate || '')
  if (!predicate.includes(EXPECTED_FAILURE)) throw new Error('original failure was not the bounded Playwright Orb-open click timeout')
  if (!predicate.includes(EXPECTED_CONTROL)) throw new Error('original failure was not the canonical semantic Orb control')
  if (!predicate.includes('data-testid="home-semantic-orb"')) throw new Error('original failure did not resolve the canonical semantic Orb button')
  if (!predicate.includes('element is visible, enabled and stable')) throw new Error('original failure did not establish Orb control actionability')
  if (!predicate.includes('performing click action')) throw new Error('original failure did not reach click dispatch')
  return true
}
