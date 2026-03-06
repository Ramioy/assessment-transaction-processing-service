#!/usr/bin/env bash
# Shared configuration for all API scripts.
# Source this file: source "$(dirname "$0")/config.sh"

NODE_ENV="${NODE_ENV:-development}"
BASE_URL="${BASE_URL:-http://localhost:3002/api/${NODE_ENV}/v1}"
API_KEY="${API_KEY:-your-development-secret-key-change-in-production}"
CONTENT_TYPE="Content-Type: application/json"

# Set API_KEY_ENABLED=true to send the x-api-key header
API_KEY_ENABLED="${API_KEY_ENABLED:-false}"

_headers() {
  if [ "$API_KEY_ENABLED" = "true" ]; then
    echo -H "$CONTENT_TYPE" -H "x-api-key: $API_KEY"
  else
    echo -H "$CONTENT_TYPE"
  fi
}

_curl() {
  if [ "$API_KEY_ENABLED" = "true" ]; then
    curl -s -H "$CONTENT_TYPE" -H "x-api-key: $API_KEY" "$@"
  else
    curl -s -H "$CONTENT_TYPE" "$@"
  fi
}

_pretty() {
  if command -v jq &>/dev/null; then
    jq .
  else
    cat
  fi
}
