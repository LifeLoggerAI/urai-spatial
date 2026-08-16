#!/usr/bin/env bash
set -euo pipefail

# Governed one-time bootstrap for the canonical URAI Spatial GitHub -> Google Cloud
# trust boundary. This script creates no service-account private keys and does not
# disable/delete any existing key. Run from an already-authenticated Google Cloud
# administrator session (for example Cloud Shell).

PROJECT_ID="${PROJECT_ID:-urai-4dc1d}"
POOL_ID="${POOL_ID:-urai-spatial-github}"
PROVIDER_ID="${PROVIDER_ID:-urai-spatial-main}"
RELEASE_SA_ID="${RELEASE_SA_ID:-urai-spatial-release}"
RELEASE_SA_EMAIL="${RELEASE_SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

EXPECTED_REPOSITORY="LifeLoggerAI/urai-spatial"
EXPECTED_REPOSITORY_ID="1167675641"
EXPECTED_OWNER_ID="215797546"
EXPECTED_REF="refs/heads/main"
EXPECTED_EVENT="workflow_dispatch"

ADMIN_SDK_SA="firebase-adminsdk-fbsvc@${PROJECT_ID}.iam.gserviceaccount.com"
RECEIPT="${RECEIPT:-urai-wif-bootstrap-receipt.json}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: required command is missing: $1" >&2
    exit 64
  }
}

need gcloud
need python3

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n 1)"
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  echo 'ERROR: no active gcloud account. Authenticate with an authorized Google account first.' >&2
  exit 65
fi

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
if [[ -z "$PROJECT_NUMBER" ]]; then
  echo "ERROR: unable to resolve project number for $PROJECT_ID" >&2
  exit 66
fi

echo "Active Google account: $ACTIVE_ACCOUNT"
echo "Project: $PROJECT_ID ($PROJECT_NUMBER)"
echo "Trust target: $EXPECTED_REPOSITORY repository_id=$EXPECTED_REPOSITORY_ID owner_id=$EXPECTED_OWNER_ID"

# Only identity/control-plane APIs needed for keyless federation.
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  --project="$PROJECT_ID" --quiet

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name='URAI Spatial GitHub' \
    --description='Keyless GitHub Actions identity pool for canonical URAI Spatial release automation.'
fi

ATTRIBUTE_MAPPING='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name'
ATTRIBUTE_CONDITION="assertion.repository_id=='${EXPECTED_REPOSITORY_ID}' && assertion.repository_owner_id=='${EXPECTED_OWNER_ID}' && assertion.ref=='${EXPECTED_REF}' && assertion.event_name=='${EXPECTED_EVENT}'"

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name='URAI Spatial main manual release' \
    --description='Accepts only manual GitHub Actions jobs from canonical urai-spatial main.' \
    --issuer-uri='https://token.actions.githubusercontent.com/' \
    --attribute-mapping="$ATTRIBUTE_MAPPING" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
else
  EXISTING_ISSUER="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" --format='value(oidc.issuerUri)')"
  EXISTING_CONDITION="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" --format='value(attributeCondition)')"
  if [[ "$EXISTING_ISSUER" != 'https://token.actions.githubusercontent.com/' || "$EXISTING_CONDITION" != "$ATTRIBUTE_CONDITION" ]]; then
    echo 'ERROR: provider already exists but its issuer/condition differs from the governed contract. Refusing to mutate it automatically.' >&2
    exit 67
  fi
fi

if ! gcloud iam service-accounts describe "$RELEASE_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RELEASE_SA_ID" \
    --project="$PROJECT_ID" \
    --display-name='URAI Spatial GitHub release' \
    --description='Dedicated keyless deployment identity for LifeLoggerAI/urai-spatial.'
fi

WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository_id/${EXPECTED_REPOSITORY_ID}"

gcloud iam service-accounts add-iam-policy-binding "$RELEASE_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --member="$WIF_MEMBER" \
  --role='roles/iam.workloadIdentityUser' \
  --condition=None \
  --quiet >/dev/null

# Minimal predefined roles required by this repository's firebase.json surface:
# Hosting, Firestore indexes/rules, Functions, and Firebase CLI API-key lookup.
PROJECT_ROLES=(
  roles/firebasehosting.admin
  roles/serviceusage.apiKeysViewer
  roles/cloudfunctions.admin
  roles/datastore.indexAdmin
  roles/firebaserules.admin
  roles/serviceusage.serviceUsageConsumer
)

for role in "${PROJECT_ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RELEASE_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

# Firebase documents that Functions deployment also requires Service Account User.
# Bind only to runtime identities that actually exist rather than project-wide.
RUNTIME_SERVICE_ACCOUNTS=(
  "${PROJECT_ID}@appspot.gserviceaccount.com"
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
)

for runtime_sa in "${RUNTIME_SERVICE_ACCOUNTS[@]}"; do
  if gcloud iam service-accounts describe "$runtime_sa" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts add-iam-policy-binding "$runtime_sa" \
      --project="$PROJECT_ID" \
      --member="serviceAccount:${RELEASE_SA_EMAIL}" \
      --role='roles/iam.serviceAccountUser' \
      --condition=None \
      --quiet >/dev/null
  fi
done

PROVIDER_RESOURCE="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" --format='value(name)')"

# Inventory only. Existing user-managed Firebase Admin keys are intentionally not
# changed until the new identity has authenticated from GitHub and release/readback
# checks have passed.
CURRENT_KEY_IDS=""
if gcloud iam service-accounts describe "$ADMIN_SDK_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  CURRENT_KEY_IDS="$(gcloud iam service-accounts keys list --iam-account="$ADMIN_SDK_SA" --project="$PROJECT_ID" --managed-by=user --format='value(name.basename())' | paste -sd, -)"
fi

export PROJECT_ID PROJECT_NUMBER ACTIVE_ACCOUNT POOL_ID PROVIDER_ID PROVIDER_RESOURCE RELEASE_SA_EMAIL EXPECTED_REPOSITORY EXPECTED_REPOSITORY_ID EXPECTED_OWNER_ID EXPECTED_REF EXPECTED_EVENT CURRENT_KEY_IDS
python3 - <<'PY' > "$RECEIPT"
import json, os
print(json.dumps({
    "schema": "urai-github-wif-bootstrap-1",
    "projectId": os.environ["PROJECT_ID"],
    "projectNumber": os.environ["PROJECT_NUMBER"],
    "operator": os.environ["ACTIVE_ACCOUNT"],
    "poolId": os.environ["POOL_ID"],
    "providerId": os.environ["PROVIDER_ID"],
    "providerResource": os.environ["PROVIDER_RESOURCE"],
    "releaseServiceAccount": os.environ["RELEASE_SA_EMAIL"],
    "trustedRepository": os.environ["EXPECTED_REPOSITORY"],
    "trustedRepositoryId": os.environ["EXPECTED_REPOSITORY_ID"],
    "trustedOwnerId": os.environ["EXPECTED_OWNER_ID"],
    "trustedRef": os.environ["EXPECTED_REF"],
    "trustedEvent": os.environ["EXPECTED_EVENT"],
    "existingFirebaseAdminUserManagedKeyIds": [x for x in os.environ.get("CURRENT_KEY_IDS", "").split(",") if x],
    "serviceAccountPrivateKeyCreated": False,
    "existingKeyDisabledOrDeleted": False,
    "productionDeployPerformed": False,
    "nextGate": "Run the GitHub WIF authentication proof; only then begin one-at-a-time legacy-key disable validation."
}, indent=2))
PY

chmod 600 "$RECEIPT"

echo
echo 'WIF bootstrap complete. No existing key was disabled or deleted.'
echo "WIF_PROVIDER=${PROVIDER_RESOURCE}"
echo "WIF_SERVICE_ACCOUNT=${RELEASE_SA_EMAIL}"
echo "RECEIPT=${RECEIPT}"
echo 'NEXT: run the repository WIF authentication proof before changing any legacy key.'
