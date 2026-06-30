# Deployment proof — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: live web fetch + source script inspection.

## Deployment targets

| Target | Status |
| --- | --- |
| `https://urai.app` | Live custom-domain public preview; truthful and conservative. |
| `https://urai-4dc1d.web.app` | Stale/broken; fails production gate. |

## Firebase default failure

`https://urai-4dc1d.web.app/` served stale placeholder copy:

```text
Launch build is compiling successfully. Full app deployment is being finalized.
```

The repo's own smoke scripts treat this copy as forbidden/stale. Therefore the default Firebase host fails live deployment proof.

## Live commit proof

The repo has `/api/system/deploy-proof` source that returns a release marker and attempts to report commit SHA from environment variables. In this pass, deployed SHA was not proven live against the latest audited commit.

## Required deployment proof

- Firebase release ID.
- Deployed SHA matching latest audited main.
- `/api/system/deploy-proof` JSON from both `urai.app` and `urai-4dc1d.web.app`.
- Passing `pnpm smoke:live` for both URLs.
- Passing `pnpm smoke:home-xr:live` for both URLs.
- Stale placeholder removed from Firebase default host.

## Conclusion

Deployment is not locked. Custom domain is acceptable as public preview; Firebase default host blocks READY.
