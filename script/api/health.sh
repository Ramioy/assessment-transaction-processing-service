#!/usr/bin/env bash
# Health check — GET /health
# Public route, no API key required.
#
# Usage:
#   ./health.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | _pretty
