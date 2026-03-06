#!/usr/bin/env bash
# Webhook simulation — public endpoint, checksum validated.
#
# Usage:
#   ./webhooks.sh <checksum> '<json>'
#
# Example:
#   ./webhooks.sh abc123sha256hash '{"data":{"transaction":{"id":"12345","status":"APPROVED"}},"signature":{"properties":["data.transaction.id","data.transaction.status"]},"timestamp":1709683200}'

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

CHECKSUM="${1:?Usage: $0 <checksum> '<json>'}"
BODY="${2:?Usage: $0 <checksum> '<json>'}"

echo "POST $BASE_URL/webhooks/payment-provider"
curl -s \
  -H "$CONTENT_TYPE" \
  -H "x-event-checksum: $CHECKSUM" \
  -X POST -d "$BODY" \
  "$BASE_URL/webhooks/payment-provider" | _pretty
