# Verification queue safety repair

Base: `c731524c67ced3f677cfd19d60552a0220c0a3ad`.

Observed: closed, unmerged PR #1369 at
`1faec50c8d13ad1926ea1d172d9565b5eb4e1262` still had queued and active
verification runs after current-main successor #1370 was opened. The main
queue-maintenance workflow only runs on its own file changes or manual dispatch,
and only considers its invocation branch. It cannot currently target closed
repair PRs. It also uses the invocation SHA alone, which can be older than the
current branch head by the time the job starts.

Changes:

- Restore maintenance on ordinary pushes to the two existing authorized branches.
- Add an optional manual closed-PR scope, requiring a closed, unmerged PR in this
  repository. Open PR head/base branches and revisions are protected.
- Re-read branch/PR authority and each workflow immediately before cancellation.
- Limit cancellation to an explicit verification-workflow allowlist and push/PR
  events. Preserve manual jobs, provider/forge work, deployments, other branches,
  forks, current revisions, the maintenance job and completed artifacts.
- Keep existing Actions write scope; add only pull-request read scope. No checkout,
  cloud identity, credentials, IAM change, deployment or release-gate change.
- Register executable safety regressions in existing Spatial CI.

Validation: 18 tests pass, exercising the actual workflow script with mocked
GitHub responses, including branch advance, PR reopening and job completion
races. YAML parse, source integrity, release security guard, production authority
audit, production action pins and diff checks pass. The authority audit still
reports NO-GO / production mutation quarantined, as required.

No live cancellation or workflow dispatch occurred. This candidate needs current
CI and required independent review before merge. After acceptance, existing
backlog cleanup needs an authorized workflow-dispatch session and fresh scope
validation. The current GitHub browser is signed out, and the connector exposes
no cancellation or new-dispatch action.

Separate provider evidence: the only visible WIF authentication proof run,
33516283276, failed on its historic commit because both governed identity inputs
were empty. That is not proof of today's configuration. An attempted read-only
rerun of its old job was rejected by automatic approval review because it would
consume capacity and test obsolete code without exact rerun authorization. It
was not retried or indirectly executed. Current cloud console access returned
Site Unavailable on initial navigation and one reload. No provider changes or
current WIF verification are claimed.
