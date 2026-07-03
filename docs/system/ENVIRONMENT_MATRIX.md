# URAI Environment Matrix

Last verified: 2026-07-03

| Environment | Intended use | Canonical repository | Target | Evidence state |
| --- | --- | --- | --- | --- |
| Local | Developer execution | Repository-specific | Loopback/emulators | Not production evidence |
| Emulator | Firebase rules/functions/data tests | Repository-specific | Explicit emulator project | Must not contact production |
| Preview | Pull-request review and screenshots | `urai-spatial` for public runtime | Ephemeral Hosting preview | Requires exact PR commit |
| Staging | Integrated non-production verification | `urai-staging` or isolated service staging target | Must not alias `urai-4dc1d` | Isolation proof incomplete across legacy repos |
| Production | Public canonical runtime | `urai-spatial/urai-tier1` | `urai-4dc1d`, `https://urai.app` | Certification pending current-head checks and deploy evidence |

## Required controls

- Production is deployed only from an exact reviewed `urai-spatial/main` commit.
- `UrAi` has no automatic production trigger after PR #352.
- `UrAi-Dev` is blocked from Firebase use until historical production aliases are removed.
- Supporting repositories use their own service targets and never deploy the canonical web runtime.
- Environment variables and secret names may be documented; secret values may not be committed or printed.
- Production claims require live evidence, not merely environment-variable presence.

## Known configuration references

- Canonical public Firebase project: `urai-4dc1d`.
- Marketing uses the separate `urai-marketing` project.
- Foundation is a static/GitHub Pages surface pending its own DNS verification.
- Storytime, Communications, Investors, B2B, Studio, Jobs, Admin, Privacy, Content, and Analytics require repository-specific environment proof before production claims.
