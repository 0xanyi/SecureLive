#!/bin/bash

# Bulk Code Integration Test Runner
# This script runs comprehensive integration tests for bulk code functionality

echo "🚀 Bulk Code Integration Test Runner"
echo "===================================="

# Check if required environment files exist
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with required Supabase configuration"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check if required environment variables are set
echo "🔍 Checking environment configuration..."

# Source the environment file to check variables
set -a
source .env.local
set +a

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set in .env.local"
    exit 1
fi

echo "✅ Environment configuration looks good"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🧪 Running Bulk Code Integration Tests..."
echo "========================================"

# Run the integration tests
node tests/bulk-code-integration-tests.js

# Capture the exit code
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All integration tests completed successfully!"
    echo ""
    echo "📋 Test Coverage Summary:"
    echo "• End-to-end bulk code creation and usage flow"
    echo "• Concurrent user login scenarios up to capacity limit"
    echo "• Capacity exceeded rejection and error handling"
    echo "• Race condition handling with concurrent access"
    echo "• Automatic expiration and session cleanup"
    echo "• Usage tracking API integration"
    echo ""
    echo "✅ Requirements Verified:"
    echo "• 1.1: Bulk code creation with capacity limits (1-400)"
    echo "• 2.1: Users can access via bulk codes when capacity allows"
    echo "• 2.2: Usage counter increments on successful login"
    echo "• 2.3: Capacity exceeded rejection with appropriate error"
    echo "• 2.4: Atomic operations prevent race conditions"
    echo "• 4.1: Automatic expiration and session cleanup"
else
    echo "❌ Integration tests failed with exit code $TEST_EXIT_CODE"
    echo ""
    echo "🔧 Troubleshooting Tips:"
    echo "• Check that your Supabase database is running and accessible"
    echo "• Verify that all required database functions exist:"
    echo "  - check_bulk_code_capacity()"
    echo "  - increment_bulk_code_usage()"
    echo "  - decrement_bulk_code_usage()"
    echo "  - cleanup_inactive_sessions()"
    echo "• Ensure the access_codes table has the required columns:"
    echo "  - usage_count (integer)"
    echo "  - max_usage_count (integer)"
    echo "  - type (enum including 'bulk')"
    echo "• Check that your service role key has sufficient permissions"
fi

exit $TEST_EXIT_CODE