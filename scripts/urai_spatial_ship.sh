#!/bin/bash
# urai_spatial_ship.sh
# Purpose: A final wrapper script for launch.

echo "--- URAI Spatial Memory Shipping Control ---"

ROLLOUT_TARGET="$1"

if [ -z "$ROLLOUT_TARGET" ]; then
  echo "Error: Rollout target is required."
  echo "Usage: ./urai_spatial_ship.sh <user-id | percentage | all>"
  exit 1
fi

# This assumes you have a document in Firestore at `config/feature_flags`
# that controls feature rollouts. The command will update the field
# 'spatial_memories_rollout' within that document.
# Ensure you are authenticated with gcloud: `gcloud auth application-default login`
echo "Updating feature flag for target: $ROLLOUT_TARGET"

gcloud firestore documents update config/feature_flags \
  --update-paths "spatial_memories_rollout" \
  --update-values "$ROLLOUT_TARGET"

if [ $? -eq 0 ]; then
  echo "✅ Feature flag successfully set to '$ROLLOUT_TARGET'."
else
  echo "❌ Error updating Firestore. Please check your gcloud authentication and permissions."
  exit 1
fi


echo "--- Shipping script finished. ---"
