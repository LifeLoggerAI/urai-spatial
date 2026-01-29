#!/bin/bash
# urai_reconstruction_deploy.sh
# Purpose: Build and deploy the containerized reconstruction job and the trigger function.

echo "--- Deploying URAI Reconstruction Job ---"

GCP_PROJECT_ID="$1"
GCP_REGION="$2"

if [ -z "$GCP_PROJECT_ID" ] || [ -z "$GCP_REGION" ]; then
  echo "Error: GCP Project ID and Region are required."
  echo "Usage: ./urai_reconstruction_deploy.sh <project-id> <region>"
  exit 1
fi

# 1. TODO: Deploy the Firebase Function trigger
echo "[1/2] Deploying Firebase Function trigger..."
# (cd firebase && firebase deploy --only functions:reconstructionTrigger)

# 2. TODO: Build and deploy the Cloud Run container
echo "[2/2] Building and deploying reconstruction container..."
# gcloud builds submit --tag "gcr.io/$GCP_PROJECT_ID/reconstruct-job" apps/jobs/src/reconstruct-memory
# gcloud run deploy reconstruct-job --image "gcr.io/$GCP_PROJECT_ID/reconstruct-job" --platform managed --region "$GCP_REGION" --no-allow-unauthenticated

echo "--- Deployment script finished. ---"
