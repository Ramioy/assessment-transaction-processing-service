#!/usr/bin/env bash
# PSE financial institutions — public endpoint, no API key needed.
#
# Usage:
#   ./pse.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "GET $BASE_URL/pse/financial-institutions"
curl -s "$BASE_URL/pse/financial-institutions" | _pretty
