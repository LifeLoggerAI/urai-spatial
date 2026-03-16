#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# urai_reconstruction_deploy.sh
# Deploys the URAI Spatial Reconstruction service to Cloud Run.
#
# Behavior:
# - Fails on any error
# - Logs all output to /tmp
# - Verifies gcloud, docker/build source assumptions, and active project
# - Supports interactive local deploys and non-interactive CI deploys
# - Verifies deployed service URL after release
###############################################################################

TS="$(date +%Y%m%d_%H%M%S)"
LOG="/tmp/urai_reconstruction_deploy.${TS}.log"
exec > >(tee -a "$LOG") 2>&1

echo "== URAI SPATIAL RECONSTRUCTION DEPLOYMENT =="
echo "LOG=$LOG"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command: $1"
    exit 1
  }
}

need bash
need gcloud

SERVICE_NAME="${SERVICE_NAME:-urai-spatial-reconstruction}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
IMAGE_URI="${IMAGE_URI:-}"

echo
echo "--- STAGE 1: PRE-FLIGHT CHECKS ---"

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo "ERROR: gcloud project is not set."
  echo "Run: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi

echo "✅ gcloud project set: ${PROJECT_ID}"

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [ -z "${ACTIVE_ACCOUNT}" ]; then
  echo "ERROR: no active gcloud account found."
  echo "Run: gcloud auth login"
  exit 1
fi

echo "✅ Active gcloud account: ${ACTIVE_ACCOUNT}"

if [ -z "${IMAGE_URI}" ]; then
  IMAGE_URI="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
fi

echo "Service : ${SERVICE_NAME}"
echo "Region  : ${REGION}"
echo "Project : ${PROJECT_ID}"
echo "Image   : ${IMAGE_URI}"

echo
echo "--- STAGE 2: IMAGE CHECK ---"
if ! gcloud container images describe "${IMAGE_URI}" >/dev/null 2>&1; then
  echo "ERROR: container image not found:"
  echo "  ${IMAGE_URI}"
  echo
  echo "Build and push the image first, or pass IMAGE_URI explicitly."
  echo "Example:"
  echo "  IMAGE_URI=us-central1-docker.pkg.dev/${PROJECT_ID}/YOUR_REPO/${SERVICE_NAME}:latest bash scripts/urai_reconstruction_deploy.sh"
  exit 1
fi

echo "✅ Container image exists."

echo
echo "--- STAGE 3: ENABLE REQUIRED API ---"
gcloud services enable run.googleapis.com >/dev/null
echo "✅ Cloud Run API enabled."

echo
echo "--- STAGE 4: DEPLOYMENT ---"
if [ "${CI:-}" = "true" ]; then
  echo "CI=true detected. Deploying non-interactively."
else
  read -r -p "Deploy Spatial Reconstruction Service to Cloud Run? (y/N) " REPLY
  if [[ ! "${REPLY:-}" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --quiet

echo "✅ Deployment succeeded."

echo
echo "--- STAGE 5: VERIFY SERVICE ---"
SERVICE_URL="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format='value(status.url)'
)"

if [ -z "${SERVICE_URL}" ]; then
  echo "ERROR: deployment finished but service URL could not be resolved."
  exit 1
fi

echo "✅ Service URL: ${SERVICE_URL}"

echo
echo "== SPATIAL RECONSTRUCTION DEPLOYMENT COMPLETE =="