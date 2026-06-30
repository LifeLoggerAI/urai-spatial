# Live commit proof — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: source route inspected; live commit match not proven.

## Source deploy-proof endpoint

The source file `urai-tier1/src/app/api/system/deploy-proof/route.ts` returns:

- `service: urai-spatial-deploy-proof`
- repository name
- release marker
- source surface
- public routes
- forbidden live copy list
- environment commit SHA from `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA`, `NEXT_PUBLIC_GIT_SHA`, or `SOURCE_VERSION`

## Live proof status

`BLOCKED / NOT PROVEN`

No live deploy-proof JSON matching the latest audited commit was captured in this pass. Until that exists, production deployment freshness remains blocked.

## Acceptance criteria

1. Deploy latest audited commit.
2. Fetch `/api/system/deploy-proof` from both live URLs.
3. Confirm `environment.commitSha` equals latest audited commit SHA.
4. Confirm release marker is present.
5. Confirm no stale placeholder copy exists on any public route.
