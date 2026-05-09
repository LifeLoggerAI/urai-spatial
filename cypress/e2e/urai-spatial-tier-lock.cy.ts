const LOCK_VERSION = '2026-05-09.urai-spatial.locked.v1';

describe('URAI Spatial Tier 1-5 lock', () => {
  it('returns the canonical lock contract shape', () => {
    cy.request('/api/system/urai-spatial-lock').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.ok).to.eq(true);
      expect(response.body.service).to.eq('urai-spatial');
      expect(response.body.status).to.eq('locked');
      expect(response.body.done).to.eq(true);
      expect(response.body.version).to.eq(LOCK_VERSION);
      expect(response.body.assertions).to.deep.eq({
        tiersComplete: true,
        versionLocked: true,
        acceptancePresent: true,
        testsPresent: true,
      });
      expect(response.body.tiers).to.have.length(5);
      response.body.tiers.forEach((tier: { status: string; done: boolean; assertions: string[]; tests: string[] }) => {
        expect(tier.status).to.eq('locked');
        expect(tier.done).to.eq(true);
        expect(tier.assertions.length).to.be.greaterThan(0);
        expect(tier.tests.length).to.be.greaterThan(0);
      });
    });
  });

  it('exposes the same lock target through the integration contract', () => {
    cy.request('/api/system/integration-contract').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.service).to.eq('urai-spatial');
      expect(response.body.locks.uraiSpatial).to.include({
        status: 'locked',
        done: true,
        lockVersion: LOCK_VERSION,
        tierCount: 5,
        route: '/api/system/urai-spatial-lock',
      });
    });
  });
});
