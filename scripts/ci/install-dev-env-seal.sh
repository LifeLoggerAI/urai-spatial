#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO="urai-spatial"
IDX_DIR=".idx"

echo "🔐 Installing URAI Dev-Env Seal"

mkdir -p "$IDX_DIR"

FILES=(
  ATTESTATION.md
  ATTESTATION.md.asc
  LOCK.md
  STATUS.md
  IDX_LOCK_HASH.txt
)

for f in "${FILES[@]}"; do
  curl -fsSL \
    "https://raw.githubusercontent.com/URAI-Labs/$SOURCE_REPO/main/.idx/$f" \
    -o "$IDX_DIR/$f"
done

echo "✅ Dev-Env Seal installed"
echo "🔎 Verify with:"
echo "gpg --verify .idx/ATTESTATION.md.asc .idx/ATTESTATION.md"
