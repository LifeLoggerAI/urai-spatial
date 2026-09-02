# URAI Spatial Production Secrets

Production Google/Firebase authentication must use short-lived identity. Long-lived service-account JSON, private keys, and Firebase CI tokens are prohibited for the canonical production path.

## Required non-secret configuration

### URAI_SPATIAL_FIREBASE_PROJECT_ID

Firebase / Google Cloud project ID used by deploy and verification commands.

Current production project:

```text
urai-4dc1d
```

### GitHub / CI Workload Identity Federation variables

Configure the protected production environment with the WIF provider and the least-privilege service account required by the specific workflow. Existing governed workflows use variables such as:

- `GCP_WIF_PROVIDER`
- workflow-specific service-account variables (for example `GCP_MAPS_AUDIT_SERVICE_ACCOUNT` or `GCP_MAPS_ADMIN_SERVICE_ACCOUNT`)

The production release path must not be re-enabled until its own least-privilege WIF/IAM identity and runtime read-back are independently verified.

## Runtime authentication

Server-side Google/Firebase access must use one of:

- managed Application Default Credentials supplied by the hosting/runtime platform; or
- a protected `external_account` Workload Identity Federation configuration referenced by `GOOGLE_APPLICATION_CREDENTIALS`.

The canonical ADC guard rejects long-lived credential environment variables and rejects service-account private-key fields in ADC configuration.

## Optional variables

### URAI_SPATIAL_PRODUCTION_URL

GitHub Actions repository/environment variable used by production smoke verification.

## Explicitly prohibited

Do not configure or commit any of the following for the canonical production release path:

- `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_TOKEN`
- service-account JSON files
- production `.env.local`
- private API keys or admin/founder token material

Historical keys must be revoked provider-side after dependencies are migrated and verified. Source cleanup alone is not credential revocation.
