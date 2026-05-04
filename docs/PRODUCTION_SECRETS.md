# URAI Spatial Production Secrets

Configure these in GitHub repository or environment secrets before production deploy.

## Required

### FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL

Full JSON service account with deploy access to the URAI Spatial Firebase project.

Recommended roles:

- Firebase Admin
- Cloud Functions Developer
- Firebase Hosting Admin
- Cloud Datastore Index Admin
- Service Account User, if required by the project

### URAI_SPATIAL_FIREBASE_PROJECT_ID

Firebase project ID used for deploy commands.

Example:

```text
urai-spatial-prod
```

## Optional variables

### URAI_SPATIAL_PRODUCTION_URL

GitHub Actions repository/environment variable used by the production smoke test.

Example:

```text
https://spatial.urai.app
```

If not set, the production workflow falls back to:

```text
https://urai-spatial.web.app
```

## Do not commit

- Service account JSON
- production `.env.local`
- private API keys
- admin/founder token material
