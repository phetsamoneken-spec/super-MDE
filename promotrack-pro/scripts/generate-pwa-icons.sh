#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_image=data/branding/super-mde-logo.png
for size in 32 180 192 512; do
  magick "$source_image" -resize "${size}x${size}" -strip -define png:compression-level=9 "public/icons/super-mde-${size}-v1.png"
done
# Maskable Android art has a full-bleed background and a protected central mark.
# Do not put the normal rounded logo on a white padded canvas.
maskable_image=data/branding/super-mde-maskable-v2.png
for size in 192 512; do
  magick "$maskable_image" -resize "${size}x${size}" -alpha off -strip -define png:compression-level=9 "public/icons/super-mde-maskable-${size}-v2.png"
done
