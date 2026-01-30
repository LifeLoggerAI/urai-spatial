#!/bin/bash
set -euo pipefail

###############################################################################
# urai_reconstruction_deploy.sh
# Deploys the spatial reconstruction service.
# This should be run after the main application is deployed and the feature
# flag for spatial memories has been rolled out.
#
# This script is the final step in bringing the full spatial memory system online.
###############################################################################

TS="$(date +%Y%m%d_%H%M%S)"
LOG="/tmp/urai_reconstruction_deploy.${TS}.log"
exec > >(tee -a "$LOG") 2>&1

echo "== URAI SPATIAL RECONSTRUCTION DEPLOYMENT =="
echo "LOG=$LOG"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing '$1'"; exit 1; }; }
need gcloud

# --- Pre-flight Checks ---
echo
echo "--- STAGE 1: PRE-FLIGHT CHECKS ---"

# Ensure gcloud is configured
if ! gcloud config get-value project &>/dev/null; then
    echo "ERROR: gcloud project not set. Please run 'gcloud config set project <YOUR_PROJECT_ID>'."
    exit 1
fi
echo "✅ gcloud project is set."

# --- Confirmation ---
echo
echo "--- STAGE 2: DEPLOYMENT ---"
read -p "Deploy the Spatial Reconstruction Service to Google Cloud Run? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# --- Deploy to Cloud Run ---
SERVICE_NAME="urai-spatial-reconstruction"
REGION="us-central1" # Or your preferred region

echo "Deploying to Google Cloud Run..."
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Placeholder for the actual container image
# In a real scenario, this would be built and pushed to GCR/Artifact Registry
CONTAINER_IMAGE="gcr.io/$(gcloud config get-value project)/$SERVICE_NAME:latest"

echo "Container: $CONTAINER_IMAGE"
echo "(Note: This script assumes the container has been built and pushed)"

gcloud run deploy "$SERVICE_NAME" \
  --image "$CONTAINER_IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT SUCCEEDED."
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format="value(status.url)")
    echo "Service URL: $SERVICE_URL"
else
    echo "❌ DEPLOYMENT FAILED. Check Cloud Run logs."
    exit 1
fi

echo
echo "== SPATIAL RECONSTRUCTION DEPLOYMENT COMPLETE =="
