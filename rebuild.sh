#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# .env 로드
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.env"
  set +a
fi

IMAGE_NAME="obsidian-web-viewer"
CONTAINER_VOLUME_VAULT="${OBSIDIAN_VAULT_PATH:-/tmp/sample-vault}"
CONTAINER_VOLUME_CACHE="${OWV_CACHE_PATH:-/tmp/owv-cache}"

discord_notify() {
  local status="$1"
  local color="$2"
  local description="$3"

  if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
    return
  fi

  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  curl -s -o /dev/null -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"embeds\": [{
        \"title\": \"$status\",
        \"description\": \"$description\",
        \"color\": $color,
        \"footer\": { \"text\": \"$timestamp\" }
      }]
    }"
}

echo "▶ Building Docker image..."
if ! docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"; then
  discord_notify "❌ 빌드 실패" 15158332 "obsidian-web-viewer 재빌드에 실패했습니다."
  echo "Build failed."
  exit 1
fi

echo "▶ Stopping old container..."
OLD_ID=$(docker ps --filter "ancestor=$IMAGE_NAME" --format "{{.ID}}" | head -1)
if [[ -n "$OLD_ID" ]]; then
  docker stop "$OLD_ID" > /dev/null
fi

echo "▶ Starting new container..."
docker run -d -p 8088:8088 \
  -v "${CONTAINER_VOLUME_VAULT}:/vault:rw" \
  -v "${CONTAINER_VOLUME_CACHE}:/cache:rw" \
  "$IMAGE_NAME" > /dev/null

echo "▶ Sending Discord notification..."
discord_notify "✅ 재빌드 완료" 3066993 "obsidian-web-viewer 재빌드 및 재시작이 완료됐습니다."

echo "Done."
