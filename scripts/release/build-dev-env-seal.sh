#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="release"
ZIP_NAME="URAI-SPATIAL-DEV-ENV-SEAL.zip"

mkdir -p "$OUT_DIR"

echo "🏛️ Building Dev-Env Seal bundle"

zip -j "$OUT_DIR/$ZIP_NAME" \
  .idx/dev.nix \
  .idx/LOCK.md \
  .idx/STATUS.md \
  .idx/ATTESTATION.md \
  .idx/ATTESTATION.md.asc \
  .idx/IDX_LOCK_HASH.txt

echo "✅ Bundle created:"
echo "$OUT_DIR/$ZIP_NAME"

echo
echo "Verification:"
echo "unzip -l $OUT_DIR/$ZIP_NAME"
echo "gpg --verify .idx/ATTESTATION.md.asc .idx/ATTESTATION.md"
