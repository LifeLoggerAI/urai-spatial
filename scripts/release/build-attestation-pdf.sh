#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="release"
SRC=".idx/ATTESTATION.md"
OUT="$OUT_DIR/URAI-SPATIAL-DEV-ENV-ATTESTATION.pdf"

mkdir -p "$OUT_DIR"

pandoc "$SRC" \
  --standalone \
  --from markdown \
  --to pdf \
  --metadata title="URAI Spatial – Dev Environment Attestation" \
  -o "$OUT"

echo "✅ PDF generated:"
echo "$OUT"
