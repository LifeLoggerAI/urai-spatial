#!/bin/bash
# urai_spatial_ship.sh
# Purpose: A final wrapper script for launch.

echo "--- URAI Spatial Memory Shipping Control ---"

ROLLOUT_TARGET="$1"
FEATURE_FLAG_DOC="config/feature_flags"
FEATURE_FLAG_FIELD="spatial_memories_rollout"

if [ -z "$ROLLOUT_TARGET" ]; then
  echo "Error: Rollout target is required."
  echo "Usage: ./urai_spatial_ship.sh <user-id | percentage:50 | all>"
  exit 1
fi

echo "This script will update the feature flag in Firestore."
echo "Document:  $FEATURE_FLAG_DOC"
echo "Field:     $FEATURE_FLAG_FIELD"
echo "New Value: $ROLLOUT_TARGET"
echo

# Safety check: ensure gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud command could not be found."
    echo "Please install and configure the Google Cloud SDK."
    exit 1
fi

# Safety check: ensure user is authenticated
if ! gcloud auth print-access-token --quiet &> /dev/null; then
  echo "Warning: No active gcloud credentials found."
  echo "Please run \'gcloud auth application-default login\' first."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Confirmation prompt
read -p "Are you sure you want to proceed with the update? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Updating Firestore... "

# The command to update the Firestore document.
gcloud firestore documents update "$FEATURE_FLAG_DOC" \
  --update-fields "$FEATURE_FLAG_FIELD"="$ROLLOUT_TARGET"

if [ $? -eq 0 ]; then
  echo "✅ Success: Feature flag updated in Firestore."
  echo "Rollout target for \'spatial_memories\' is now set to \'$ROLLOUT_TARGET\'."
else
  echo "❌ Error: Failed to update Firestore document."
  echo "Please check your gcloud configuration, permissions, and the document path."
  exit 1
fi
