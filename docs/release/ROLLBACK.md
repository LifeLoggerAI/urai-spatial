# URAI Release Recovery and Rollback

Last verified: 2026-07-03

## Required record before release

No new production release may begin until these values are recorded:

- current deployed commit or deploy-proof marker;
- proposed release commit;
- known-good rollback commit;
- Firebase project and Hosting target;
- workflow run reference;
- active asset manifest checksum;
- functions and rules version where applicable.

## Public runtime recovery

1. Stop further release activity and preserve the failing evidence.
2. Select the previously recorded known-good commit.
3. install exactly the committed dependency graph.
4. Run the canonical launch and release checks against that commit.
5. Restore through the guarded `urai-spatial` release path only.
6. Run the hardened custom-domain smoke against `https://urai.app`.
7. Record the final deployed commit, route results, timestamp, operator, and reason.

A legacy repository must never be used as an unreviewed recovery shortcut.

## Asset recovery

1. Identify the last known-good promoted handoff manifest.
2. Revert the reviewed asset-promotion merge or open a reviewed recovery pull request.
3. Do not trigger paid generation merely to recover.
4. Revalidate checksums, required files, formats, dimensions, fallback paths, and mobile variants.
5. Rebuild and run custom-domain smoke after restoration.

## Functions and rules recovery

1. Select the previous known-good functions and rules commit.
2. Review rule differences for data-access impact.
3. Build the exact recovery source.
4. Restore only the intended functions or rules scope.
5. Run authenticated allow and deny checks.
6. Record the result and affected environment.

## Jobs and provider recovery

- Pause new dispatch before worker changes.
- Preserve or safely drain in-flight work.
- Retain idempotency keys and audit logs.
- Restore the known-good worker or function version.
- Verify queue health, dead-letter behavior, callback authentication, and cost controls.
- Review side effects before replaying dead-letter work.

## Completion criteria

Recovery is complete only when:

- the exact restored commit is known;
- public route and API fingerprints pass;
- slash and query continuity pass;
- legacy runtime markers are absent;
- privacy and security negative paths pass;
- monitoring is healthy;
- evidence is attached to the release record.
