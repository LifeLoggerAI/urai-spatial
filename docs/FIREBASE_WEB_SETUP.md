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
alignment are missing/invalid. It neither reveals key values nor contacts
Firebase. To verify actual connectivity, Auth, Rules, functions, and hosting,
use the governed integration tests and protected deployment evidence workflow.

Do **not** commit `.env.local` or service-account JSON. Server-only Firebase
Admin uses protected, short-lived external-account WIF/ADC credentials per
`docs/PRODUCTION_SECRETS.md`. No production deploy is authorized by this setup.

## R591: fail-closed default domain and bucket review (HOLD)

The static preflight recognizes only the selected project's default Firebase Auth
domain (`<project>.firebaseapp.com`) and its two possible default Storage
bucket names (`<project>.appspot.com` or `<project>.firebasestorage.app`).
These are allowed **naming patterns**, not a claim that either bucket exists,
that the app is correctly registered, or that any IAM/Rules are secure.

A custom Auth domain, a custom Storage bucket, or any unrelated bucket must
FAIL the static preflight. Do not add environment-controlled bypasses. If a
legitimate custom value is necessary, an independent reviewer must verify it
against the **existing target Firebase project** in the provider console and
approve an exact-source allowlist amendment and fresh negative tests. A custom
domain or bucket is not authorized merely because it is present in an .env
file, is accessible, or matches a syntactic pattern.

Validation reads **public web config only**; it does not retrieve service
account keys, ID documents, private IAM evidence, or live customer data.
Even a successful check does not prove connectivity, signed-in account
isolation, post-revocation GCS denial, owner deletion, production billing,
protected GitHub checks, independent approval, or Genesis launch clearance.
Keep all launch gates on HOLD.
