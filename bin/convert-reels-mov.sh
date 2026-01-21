#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REELS_PAGE_DIR="$ROOT_DIR/user/pages/09.reels"
REELS_PUBLIC_DIR="$ROOT_DIR/user/images/reels"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is not installed. Install it and re-run."
  exit 1
fi

if [[ ! -d "$REELS_PAGE_DIR" && ! -d "$REELS_PUBLIC_DIR" ]]; then
  echo "Reels directory not found: $REELS_PAGE_DIR or $REELS_PUBLIC_DIR"
  exit 1
fi

shopt -s nullglob
convert_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 0
  shopt -s nullglob
  for mov in "$dir"/*.MOV "$dir"/*.mov; do
    base="${mov%.*}"
    mp4="${base}.mp4"
    if [[ -f "$mp4" ]]; then
      continue
    fi
    echo "Converting: $mov -> $mp4"
    ffmpeg -y -i "$mov" -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.1 \
      -preset medium -crf 23 -c:a aac -b:a 128k "$mp4"
  done
}

convert_dir "$REELS_PAGE_DIR"
convert_dir "$REELS_PUBLIC_DIR"
