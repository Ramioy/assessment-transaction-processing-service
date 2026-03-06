#!/usr/bin/env bash
# Transaction operations.
#
# Usage:
#   ./transactions.sh create '{"reference":"order-001","amountInCents":50000,"currency":"COP","paymentMethod":"CARD","paymentMethodDetails":{"type":"CARD","token":"tok_stagtest_...","installments":1},"customerEmail":"c@example.com","customerIp":"192.168.1.1"}'
#   ./transactions.sh get <uuid>

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

CMD="${1:-help}"

case "$CMD" in
  create)
    BODY="${2:?Usage: $0 create '<json>'}"
    echo "POST $BASE_URL/transactions"
    _curl -X POST -d "$BODY" "$BASE_URL/transactions" | _pretty
    ;;

  get)
    ID="${2:?Usage: $0 get <uuid>}"
    echo "GET $BASE_URL/transactions/$ID"
    _curl "$BASE_URL/transactions/$ID" | _pretty
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Commands: create '<json>' | get <uuid>"
    exit 1
    ;;
esac
