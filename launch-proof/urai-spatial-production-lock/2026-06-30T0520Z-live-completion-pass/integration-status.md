# Integration status — URAI Spatial live completion pass

| Integration | Status | User-visible risk | Proof needed |
| --- | --- | --- | --- |
| Genesis/core app | Partial/unverified | Spatial routes may present product shape without proving full core-account context. | Authenticated end-to-end route using real owner context. |
| Auth | Partial/unverified | Public preview cannot be treated as private account surface. | Login/session proof, route guards, ownership checks. |
| Admin | Unverified | Admin/operator controls must not be assumed. | Admin route audit and role-check proof. |
| Content | Partial/unverified | Life Map/content records appear demo/static unless content pipeline is proven. | Real content record create/read/update/delete and render proof. |
| Analytics | Unverified | Event capture/telemetry claims must not be assumed. | Event emit, persist, query, dashboard proof. |
| Asset factory | Partial/source assets only | Visual surface depends on static assets; pipeline/versioning proof not verified here. | Asset manifest/version/provenance proof. |
| Marketing/public surfaces | Partial/live custom domain | `urai.app` public preview is live and truthful; Firebase default hosting is stale. | Cross-domain deploy freshness and smoke proof. |
| Privacy/legal | Partial/public copy | Public copy says private actions/data remain gated; full deletion/export integration not verified. | Privacy request lifecycle proof. |
| Firebase hosting | Split | Custom domain serves updated preview; default Firebase web app serves stale placeholder. | Redeploy latest audited commit and smoke both URLs. |
| Firebase Functions/Firestore/Storage | Unverified in this pass | Dynamic/private claims may overstate backend readiness if not proven. | Emulator/rules tests plus production-safe health checks. |

## Integration conclusion

URAI Spatial is credible as a public, static-safe spatial preview. It is not yet proven as a fully integrated private Genesis/auth/Life Map runtime. The public copy on `urai.app` correctly avoids claiming autonomous/private/headset readiness, but source and deployment proof must be closed before READY.
