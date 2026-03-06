#!/usr/bin/env bash
# Card tokenization.
#
# Usage:
#   ./tokenization.sh '{"number":"4242424242424242","expMonth":"12","expYear":"2028","cvc":"123","cardHolder":"JOHN DOE"}'

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

BODY="${1:?Usage: $0 '<json>'}"
echo "POST $BASE_URL/tokenization/cards"
_curl -X POST -d "$BODY" "$BASE_URL/tokenization/cards" | _pretty
