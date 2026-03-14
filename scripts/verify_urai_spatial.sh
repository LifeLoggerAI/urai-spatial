#!/usr/bin/env bash
set -euo pipefail

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command: $1"
    exit 1
  }
}

need firebase
need curl
need awk
need grep
need sed

PROJECT_ID="$(firebase use --json 2>/dev/null | sed -n 's/.*"active":"\([^"]*\)".*/\1/p')"

if [ -z "${PROJECT_ID:-}" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "ERROR: could not determine active Firebase project"
  exit 1
fi

PRIMARY_URL="https://${PROJECT_ID}.web.app"
ALT_URL="https://${PROJECT_ID}.firebaseapp.com"
BASE_URL=""

check_url() {
  local url="$1"
  curl -fsS -o /dev/null "$url/" >/dev/null 2>&1
}

if check_url "$PRIMARY_URL"; then
  BASE_URL="$PRIMARY_URL"
elif check_url "$ALT_URL"; then
  BASE_URL="$ALT_URL"
else
  echo "ERROR: could not verify a live Hosting URL for project: $PROJECT_ID"
  echo "Tried:"
  echo "  $PRIMARY_URL"
  echo "  $ALT_URL"
  exit 1
fi

echo "Using Hosting URL: $BASE_URL"

check_route() {
  local path="$1"
  echo "Checking: $BASE_URL$path"
  curl -fsS -o /dev/null "$BASE_URL$path"
}

check_route "/life-map"
check_route "/dream-planetarium"
check_route "/ritual-ar"

firebase firestore:rules:get >/dev/null

echo "VERIFY OK"