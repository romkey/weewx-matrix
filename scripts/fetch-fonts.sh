#!/usr/bin/env bash
# Download the OFL-licensed font files referenced by the Matrix skin.
# Google Fonts hosts the upstream sources; license texts are already in font/.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FONT_DIR="$ROOT/skins/Matrix/font"

mkdir -p "$FONT_DIR"

fetch() {
  local url="$1"
  local dest="$2"
  if [[ -s "$dest" ]]; then
    echo "OK  $dest (already present)"
    return
  fi
  echo "GET $dest"
  curl -fsSL "$url" -o "$dest"
}

fetch \
  "https://github.com/google/fonts/raw/main/ofl/sharetechmono/ShareTechMono-Regular.ttf" \
  "$FONT_DIR/ShareTechMono-Regular.ttf"

fetch \
  "https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf" \
  "$FONT_DIR/VT323-Regular.ttf"

echo "Fonts ready in $FONT_DIR"
