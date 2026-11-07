#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_image=data/branding/super-mde-logo.png
for size in 32 180 192 512; do
  magick "$source_image" -resize "${size}x${size}" -strip -define png:compression-level=9 "public/icons/super-mde-${size}-v1.png"
done
# The entire square artwork fits within the central 80%-diameter safe circle:
# sqrt(2) * 288/2 < 512 * .4. Android launchers can mask it without losing text.
magick "$source_image" -resize 288x288 -background white -gravity center -extent 512x512 -strip -define png:compression-level=9 public/icons/super-mde-maskable-512-v1.png
