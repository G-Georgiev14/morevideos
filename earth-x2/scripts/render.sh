#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

browser=()
if [[ -n "${REMOTION_CHROMIUM:-}" ]]; then
  browser=(--browser-executable="$REMOTION_CHROMIUM")
fi

npx --no-install remotion render src/index.tsx EarthX2 "$scratch/short.mp4" "${browser[@]}" "$@"
ffmpeg -v error -y -i "$scratch/short.mp4" -map 0:v -map 0:a -c:v copy \
  -af atrim=duration=60 -c:a aac -b:a 192k -movflags +faststart "$scratch/video.mp4"
mv "$scratch/video.mp4" out/video.mp4
npx --no-install remotion still src/index.tsx EarthX2Thumbnail out/thumbnail.png "${browser[@]}"
