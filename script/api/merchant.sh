#!/usr/bin/env bash
# Merchant configuration.
#
# Usage:
#   ./merchant.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "GET $BASE_URL/merchant/config"
_curl "$BASE_URL/merchant/config" | _pretty
