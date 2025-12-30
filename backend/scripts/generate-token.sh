#!/bin/bash

# Generate a JWT token for testing the Go backend directly.
#
# Usage:
#   ./scripts/generate-token.sh [user-id] [expiry]
#
# Examples:
#   ./scripts/generate-token.sh                    # Uses default user-id, 1h expiry
#   ./scripts/generate-token.sh my-user-123        # Custom user-id, 1h expiry
#   ./scripts/generate-token.sh my-user-123 24h    # Custom user-id, 24h expiry
#
# Then use the token:
#   TOKEN=$(./scripts/generate-token.sh) curl -s "http://localhost:8080/api/v2/property-planner/scenarios" -H "X-Auth-Token: $TOKEN"

# Configuration
SECRET="${BACKEND_SHARED_SECRET:-dev-shared-secret-change-in-production-abc123}"
DEFAULT_USER_ID="test-user-123"
DEFAULT_EXPIRY="1h"

# Parse command line args
USER_ID="${1:-$DEFAULT_USER_ID}"
EXPIRY_ARG="${2:-$DEFAULT_EXPIRY}"

# Base64URL encode (JWT-safe base64)
base64url() {
  openssl base64 -e -A | tr '+/' '-_' | tr -d '='
}

# Parse expiry string (e.g., "1h", "30m", "7d") and return seconds
parse_expiry() {
  local expiry="$1"
  local value="${expiry%[smhd]}"
  local unit="${expiry: -1}"

  case "$unit" in
    s) echo "$value" ;;
    m) echo $((value * 60)) ;;
    h) echo $((value * 3600)) ;;
    d) echo $((value * 86400)) ;;
    *)
      echo "Invalid expiry format. Use: 30s, 5m, 1h, 7d" >&2
      exit 1
      ;;
  esac
}

# Get current timestamp
NOW=$(date +%s)

# Calculate expiry timestamp
EXPIRY_SECONDS=$(parse_expiry "$EXPIRY_ARG")
EXP=$((NOW + EXPIRY_SECONDS))

# Create header and payload
HEADER='{"alg":"HS256","typ":"JWT"}'
PAYLOAD="{\"sub\":\"$USER_ID\",\"iat\":$NOW,\"exp\":$EXP}"

# Encode header and payload
HEADER_ENCODED=$(echo -n "$HEADER" | base64url)
PAYLOAD_ENCODED=$(echo -n "$PAYLOAD" | base64url)

# Create signature
SIGNATURE_INPUT="${HEADER_ENCODED}.${PAYLOAD_ENCODED}"
SIGNATURE=$(echo -n "$SIGNATURE_INPUT" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64url)

# Output the token
TOKEN="${HEADER_ENCODED}.${PAYLOAD_ENCODED}.${SIGNATURE}"
echo "$TOKEN"

# If running interactively, show usage hint
if [ -t 1 ]; then
  echo "" >&2
  echo "# Usage example:" >&2
  echo "TOKEN=\"$TOKEN\" curl -s \"http://localhost:8080/api/v2/property-planner/scenarios\" -H \"X-Auth-Token: \$TOKEN\"" >&2
fi
