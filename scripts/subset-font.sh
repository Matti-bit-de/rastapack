#!/usr/bin/env bash
# Rebuilds assets/fonts/vazirmatn-var.woff2: weights 400-800, Persian/Arabic + Latin only.
# Needs: pip install fonttools brotli   (the result is committed, so the normal build does not need Python.)
# Re-run this if the site ever needs other scripts or a weight outside 400-800.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="node_modules/vazirmatn/fonts/variable/Vazirmatn[wght].ttf"
TMP="$(mktemp -d)"
python3 -m fontTools.varLib.instancer "$SRC" "wght=400:800" -o "$TMP/limited.ttf" -q
python3 -m fontTools.subset "$TMP/limited.ttf" \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0600-06FF,U+0750-077F,U+200C-200F,U+2010-2027,U+202F-2044,U+2212,U+25CC" \
  --layout-features='*' --flavor=woff2 --no-hinting --desubroutinize \
  --output-file=assets/fonts/vazirmatn-var.woff2
rm -rf "$TMP"
ls -l assets/fonts/vazirmatn-var.woff2
