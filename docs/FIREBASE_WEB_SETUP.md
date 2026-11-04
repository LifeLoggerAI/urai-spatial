# UrAi Firebase web setup (canonical runtime)

The Firebase SDK already exists in `urai-tier1`. This setup keeps the current
production project (`urai-4dc1d`) and the separate staging project
(`urai-staging`); it does not create or deploy Firebase resources.

## Register or inspect the existing web app

In Firebase Console, open the intended **existing** Firebase project, then
**Project settings > General > Your apps > Web app > SDK setup and configuration**.
Use its web configuration in an environment file that is not committed to Git.
Do not copy configuration from `lifelogger-clean`, legacy UrAi repositories, or
the other environment.

For local development, create `urai-tier1/.env.local` from
`urai-tier1/.env.example`. Populate the Firebase web fields:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional; only if Analytics is used)

The public web config is *not* a Firebase Admin credential. It does not grant
privileged access; Authentication, App Check, Security Rules, and backend IAM
remain mandatory.

## Check the selected environment

With the Firebase web fields exported in the shell or injected by CI, run from
the **repository root**:

```bash
pnpm check:firebase:web:staging
pnpm check:firebase:web:production
```

Use the staging command only with staging web config and the production command
only with production web config. The check is intentionally explicit and
fails if required fields, project identity, web-app identity, or environment
alignment are missing/invalid. For Storage this review-only preflight accepts only the selected project's
canonical default bucket name (`<project>.firebasestorage.app` or
`<project>.appspot.com`). An arbitrary third-party bucket, even with an otherwise
correct project ID, fails closed. For Auth it accepts only the matching
`<project>.firebaseapp.com` domain until any custom domain is verified and
explicitly approved in source. Real existing custom buckets or Auth domains
may therefore remain blocked; do not change them just to satisfy this static
check. Review their exact provider-owned identifiers and add only approved
names to a separately reviewed allowlist. This check neither reveals key values nor contacts
Firebase. To verify actual connectivity, Auth, Rules, functions, and hosting,
use the governed integration tests and protected deployment evidence workflow.

Do **not** commit `.env.local` or service-account JSON. Server-only Firebase
Admin uses protected, short-lived external-account WIF/ADC credentials per
`docs/PRODUCTION_SECRETS.md`. No production deploy is authorized by this setup.
