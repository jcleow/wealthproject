#!/bin/bash

# Test script for Financial Chat System backend APIs

BASE_URL="http://localhost:8080/api/v1"
SESSION_ID="test-session-$(date +%s)"

echo "Testing Financial Chat System Backend APIs"
echo "========================================="
echo "Session ID: $SESSION_ID"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test tools endpoint
echo "2. Testing tools endpoint..."
curl -s "$BASE_URL/tools" | jq '.'
echo ""

# Test chat endpoint
echo "3. Testing chat endpoint (without OpenAI key, will fail but test structure)..."
curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-1" \
  -d '{
    "message": "I want to add a savings account with $10,000",
    "chat_id": "chat-1",
    "session_id": "'$SESSION_ID'"
  }' | jq '.'
echo ""

# Test dispatch endpoint (with mock data)
echo "4. Testing dispatch endpoint (with mock pending actions)..."
curl -s -X POST "$BASE_URL/financial/actions/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "selected_actions": [
      {
        "call_id": "test-call-1",
        "approved": true
      }
    ],
    "session_id": "'$SESSION_ID'"
  }' | jq '.'
echo ""

echo "API tests completed!"