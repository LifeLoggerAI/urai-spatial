# Hotfix Policy

Hotfixes are reserved for urgent launch issues that affect privacy, security, safety, or core public demo access. They must be small, reversible, and documented.

## Hotfix Allowed For

- Privacy issue.
- Security issue.
- Broken launch route.
- Broken demo.
- Broken Passport.
- Broken auth.
- Broken waitlist.
- Severe mobile unusability.

## Hotfix Not Allowed For

- New features.
- Large redesigns.
- Speculative improvements.
- Roadmap items.
- Noncritical copy preferences.

## Hotfix Steps

1. Reproduce issue.
2. Identify affected systems.
3. Disable risky feature flag if needed.
4. Patch smallest safe surface.
5. Run privacy tests.
6. Run smoke test.
7. Deploy.
8. Document in changelog.
9. Confirm production fix.

## Safety Notes

- Do not loosen Passport or privacy rules to restore convenience.
- Prefer disabling the affected feature over widening access.
- Public notes must not include exploit details or private data references.
