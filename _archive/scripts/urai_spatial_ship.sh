#!/usr/bin/env bash
set -euo pipefail

# urai_spatial_ship.sh
# Purpose: Controlled rollout updater for the spatial memories feature flag.

echo "=== URAI Spatial Memory Shipping Control ==="

ROLLOUT_TARGET="${1:-}"
FEATURE_FLAG_COLLECTION="config"
FEATURE_FLAG_DOC_ID="feature_flags"
FEATURE_FLAG_FIELD="spatial_memories_rollout"

usage() {
  echo "Usage: ./urai_spatial_ship.sh <user-id | percentage:N | all>"
  echo
  echo "Examples:"
  echo "  ./urai_spatial_ship.sh 8k3fUser123"
  echo "  ./urai_spatial_ship.sh percentage:10"
  echo "  ./urai_spatial_ship.sh all"
}

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command: $1"
    exit 1
  }
}

validate_target() {
  local target="$1"

  if [ -z "$target" ]; then
    echo "ERROR: rollout target is required."
    usage
    exit 1
  fi

  if [ "$target" = "all" ]; then
    return 0
  fi

  if [[ "$target" =~ ^percentage:([0-9]{1,3})$ ]]; then
    local pct="${BASH_REMATCH[1]}"
    if [ "$pct" -ge 0 ] && [ "$pct" -le 100 ]; then
      return 0
    fi
    echo "ERROR: percentage must be between 0 and 100."
    exit 1
  fi

  if [[ "$target" =~ ^[A-Za-z0-9_-]+$ ]]; then
    return 0
  fi

  echo "ERROR: invalid rollout target: $target"
  usage
  exit 1
}

need gcloud
need date

validate_target "$ROLLOUT_TARGET"

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: gcloud project is not set."
  echo "Run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "ERROR: no active gcloud account found."
  echo "Run: gcloud auth login"
  exit 1
fi

echo "Project:   $PROJECT_ID"
echo "Account:   $ACTIVE_ACCOUNT"
echo "Collection:$FEATURE_FLAG_COLLECTION"
echo "Document:  $FEATURE_FLAG_DOC_ID"
echo "Field:     $FEATURE_FLAG_FIELD"
echo "New Value: $ROLLOUT_TARGET"
echo "Time:      $TS"
echo

if [ "${CI:-}" != "true" ]; then
  read -r -p "Proceed with Firestore feature flag update? (y/N) " REPLY
  if [[ ! "${REPLY:-}" =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
  fi
else
  echo "CI=true detected. Proceeding non-interactively."
fi

echo "Updating Firestore document..."

gcloud firestore documents update \
  "${FEATURE_FLAG_COLLECTION}/${FEATURE_FLAG_DOC_ID}" \
  --project="$PROJECT_ID" \
  --update-fields \
  "${FEATURE_FLAG_FIELD}=${ROLLOUT_TARGET},updatedAt=${TS},updatedBy=${ACTIVE_ACCOUNT}"

echo "✅ Success: feature flag updated."
echo "spatial_memories rollout is now: $ROLLOUT_TARGET"