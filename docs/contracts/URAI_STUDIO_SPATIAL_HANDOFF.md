# URAI Studio Spatial Handoff Contract

## Release boundary

This contract describes preview-safe handoff behavior between Studio and Spatial.

A handoff package is not proof that an advanced runtime or external service is live.

A handoff package cannot override the gated release matrix.

## Allowed handoff content

A handoff package may include:

- public-safe scene metadata
- labels
- preview-safe asset references
- tier flags
- fallback rendering hints
- non-secret configuration hints

## Blocked handoff content

A handoff package must not include:

- private raw user data
- secrets
- credentials
- unrestricted service tokens
- unsupported service claims
- unsupported device claims
- unsupported advanced runtime claims

## Runtime rule

If a required service or runtime is missing, the app must render fallback-safe web content instead of claiming unavailable behavior.

## Production rule

Production release claims must be based on deployment evidence, integration evidence, consent boundaries, and smoke-test results.
