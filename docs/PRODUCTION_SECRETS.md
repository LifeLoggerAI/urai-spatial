# URAI Spatial Production Identity Boundary

Production release is **NO-GO**. The repository currently exposes no approved production deployment or Hosting-recovery credential path.

## Prohibited Google/Firebase credentials

Do not create, upload, synchronize, or configure:

- service-account JSON;
- `FIREBASE_SERVICE_ACCOUNT_JSON`;
- `FIREBASE_PRIVATE_KEY`;
- `FIREBASE_CLIENT_EMAIL`;
- authorized-user Application Default Credentials;
- raw Firebase access or refresh tokens.

## Allowed future identity shape

A future non-Google runtime may use `GOOGLE_APPLICATION_CREDENTIALS` only when it points to a protected, regular, non-symlinked `external_account` Workload Identity Federation configuration. That configuration contains no private key and is not committed to this repository.

Before any production authority is restored, independently prove:

- historical key revocation and old-credential negative authentication;
- Cloud Audit Log review;
- narrow WIF trust conditions and least-privilege IAM;
- protected runtime configuration installation and read-back;
- repository/environment secret-settings inspection;
- exact-head staging validation and eligible non-author approval.

`FIREBASE_PROJECT_ID` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID` identifies a project; it does not prove identity or authorization.

## Other provider secrets

Stripe or other non-Google provider secrets remain separate protected settings. Their presence never authorizes Firebase deployment or changes the NO-GO classification.

## Do not commit

- WIF external-account configuration files;
- service-account JSON;
- production `.env.local`;
- private API keys;
- admin/founder token material.
