# URAI route authority

The canonical route authority is generated from `urai-tier1/src/app` and enforced by the production-route release gate. Any newly introduced route must be classified as public, authenticated, elevated/internal, service, redirect, or removed before release.

Unknown routes fail the release authority check. Public indexing remains disabled until production-domain and release verification are complete.
