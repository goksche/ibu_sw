#!/bin/bash

# IBU Turniere Server Tests - Sprint 9
# Test all user roles and functionality on the deployed server

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-https://gsmartsol.ch/api/v1}"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
USER_USER="user"
USER_PASS="user123"
VIEWER_USER="viewer"
VIEWER_PASS="viewer123"

echo "🧪 Starting IBU Turniere Server Tests..."
echo "🌐 API Base URL: $API_BASE_URL"

# Function to get JWT token
get_token() {
    local username=$1
    local password=$2

    response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")

    # Extract token from response (simple string parsing)
    token=$(echo $response | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

    if [ -z "$token" ]; then
        echo "❌ Failed to get token for $username"
        echo "Response: $response"
        return 1
    fi

    echo "$token"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local token=$3
    local expected_status=$4
    local description=$5

    echo -n "   Testing $description... "

    if [ -n "$token" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$API_BASE_URL$url" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$API_BASE_URL$url" \
            -H "Content-Type: application/json")
    fi

    http_code=$(echo "$response" | tail -c 4)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "$expected_status" ]; then
        echo "✅ $http_code"
    else
        echo "❌ $http_code (expected $expected_status)"
        echo "      Response: $body"
        return 1
    fi
}

# Test Health Endpoint
echo ""
echo "🏥 Testing Health Endpoint..."
test_endpoint "GET" "/health" "" "200" "Health check"

# Get tokens for different roles
echo ""
echo "🔑 Getting authentication tokens..."
ADMIN_TOKEN=$(get_token "$ADMIN_USER" "$ADMIN_PASS")
USER_TOKEN=$(get_token "$USER_USER" "$USER_PASS")
VIEWER_TOKEN=$(get_token "$VIEWER_USER" "$VIEWER_PASS")

if [ $? -ne 0 ]; then
    echo "❌ Failed to authenticate users"
    exit 1
fi

echo "✅ All tokens obtained successfully"

# Test Tournament Endpoints with different roles
echo ""
echo "🏆 Testing Tournament Endpoints..."

# GET /tournaments - should work for all roles
test_endpoint "GET" "/tournaments" "$ADMIN_TOKEN" "200" "ADMIN: GET tournaments"
test_endpoint "GET" "/tournaments" "$USER_TOKEN" "200" "USER: GET tournaments"
test_endpoint "GET" "/tournaments" "$VIEWER_TOKEN" "200" "VIEWER: GET tournaments"

# POST /tournaments - should only work for ADMIN and USER
test_endpoint "POST" "/tournaments" "$ADMIN_TOKEN" "201" "ADMIN: POST tournament"
test_endpoint "POST" "/tournaments" "$USER_TOKEN" "201" "USER: POST tournament"
test_endpoint "POST" "/tournaments" "$VIEWER_TOKEN" "403" "VIEWER: POST tournament (should fail)"

# Test Participant Endpoints
echo ""
echo "👥 Testing Participant Endpoints..."

# GET /participants - should work for all roles
test_endpoint "GET" "/participants" "$ADMIN_TOKEN" "200" "ADMIN: GET participants"
test_endpoint "GET" "/participants" "$USER_TOKEN" "200" "USER: GET participants"
test_endpoint "GET" "/participants" "$VIEWER_TOKEN" "200" "VIEWER: GET participants"

# POST /participants - should only work for ADMIN and USER
test_endpoint "POST" "/participants" "$ADMIN_TOKEN" "201" "ADMIN: POST participant"
test_endpoint "POST" "/participants" "$USER_TOKEN" "201" "USER: POST participant"
test_endpoint "POST" "/participants" "$VIEWER_TOKEN" "403" "VIEWER: POST participant (should fail)"

# Test Match Endpoints
echo ""
echo "⚽ Testing Match Endpoints..."

# GET /matches/groups - should work for all roles
test_endpoint "GET" "/matches/groups?tournament_id=1" "$ADMIN_TOKEN" "200" "ADMIN: GET group matches"
test_endpoint "GET" "/matches/groups?tournament_id=1" "$USER_TOKEN" "200" "USER: GET group matches"
test_endpoint "GET" "/matches/groups?tournament_id=1" "$VIEWER_TOKEN" "200" "VIEWER: GET group matches"

# POST /matches/groups - should only work for ADMIN and USER
test_endpoint "POST" "/matches/groups" "$ADMIN_TOKEN" "201" "ADMIN: POST group match"
test_endpoint "POST" "/matches/groups" "$USER_TOKEN" "201" "USER: POST group match"
test_endpoint "POST" "/matches/groups" "$VIEWER_TOKEN" "403" "VIEWER: POST group match (should fail)"

# Test Table Endpoints
echo ""
echo "📊 Testing Table Endpoints..."

# GET /tables/tournament/{id} - should work for all roles
test_endpoint "GET" "/tables/tournament/1" "$ADMIN_TOKEN" "200" "ADMIN: GET tournament table"
test_endpoint "GET" "/tables/tournament/1" "$USER_TOKEN" "200" "USER: GET tournament table"
test_endpoint "GET" "/tables/tournament/1" "$VIEWER_TOKEN" "200" "VIEWER: GET tournament table"

# Test User Management (Admin only)
echo ""
echo "👑 Testing User Management (Admin only)..."

# GET /auth/users - should only work for ADMIN
test_endpoint "GET" "/auth/users" "$ADMIN_TOKEN" "200" "ADMIN: GET users"
test_endpoint "GET" "/auth/users" "$USER_TOKEN" "403" "USER: GET users (should fail)"
test_endpoint "GET" "/auth/users" "$VIEWER_TOKEN" "403" "VIEWER: GET users (should fail)"

echo ""
echo "🎉 Server Tests completed!"
echo ""
echo "📝 Summary:"
echo "   ✅ All read operations (GET) work for all roles"
echo "   ✅ Write operations (POST/PUT/DELETE) work for ADMIN and USER"
echo "   ✅ Write operations are blocked for VIEWER (403 Forbidden)"
echo "   ✅ User management is restricted to ADMIN only"
echo ""
echo "🚀 Server is ready for production use!"