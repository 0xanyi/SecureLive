#!/bin/bash

# Comprehensive Bulk Code Test Runner
# Runs all bulk code integration tests in sequence

echo "🚀 Comprehensive Bulk Code Test Suite"
echo "====================================="

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

# Check environment configuration
echo "🔍 Checking environment configuration..."

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

echo "✅ Environment configuration verified"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo "🧪 Running: $test_name"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo "✅ $test_name - PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $test_name - FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

echo ""
echo "🧪 Starting Comprehensive Test Suite..."
echo "======================================="

# Test 1: Database Function Tests
run_test "Database Function Tests" "node tests/run-database-tests.js"

# Test 2: Bulk Code Usage API Tests
run_test "Bulk Code Usage API Tests" "node tests/bulk-code-usage-api-tests.js"

# Test 3: Bulk Code Error Handling Tests
run_test "Bulk Code Error Handling Tests" "node tests/bulk-code-error-handling-tests.js"

# Test 4: Bulk Code Cleanup Tests
run_test "Bulk Code Cleanup Tests" "node tests/bulk-code-cleanup-tests.js"

# Test 5: Core Integration Tests
run_test "Core Integration Tests" "node tests/bulk-code-integration-tests.js"

# Test 6: API Integration Tests
run_test "API Integration Tests" "node tests/bulk-code-api-integration-tests.js"

# Print final results
echo ""
echo "📊 Comprehensive Test Results Summary"
echo "===================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED!"
    echo ""
    echo "📋 Complete Test Coverage Verified:"
    echo "✅ Database Functions"
    echo "   • check_bulk_code_capacity()"
    echo "   • increment_bulk_code_usage()"
    echo "   • decrement_bulk_code_usage()"
    echo "   • cleanup_inactive_sessions()"
    echo ""
    echo "✅ API Endpoints"
    echo "   • POST /api/admin/codes/generate"
    echo "   • POST /api/auth/code-login"
    echo "   • GET /api/admin/bulk-codes/usage"
    echo "   • GET /api/admin/bulk-codes/status"
    echo ""
    echo "✅ Error Handling"
    echo "   • Capacity exceeded scenarios"
    echo "   • Expired code scenarios"
    echo "   • Invalid code scenarios"
    echo "   • Concurrent access conflicts"
    echo "   • Database error recovery"
    echo ""
    echo "✅ Integration Scenarios"
    echo "   • End-to-end bulk code creation and usage"
    echo "   • Concurrent user login scenarios"
    echo "   • Capacity limit enforcement"
    echo "   • Automatic expiration and cleanup"
    echo "   • Usage tracking and monitoring"
    echo ""
    echo "✅ Requirements Compliance"
    echo "   • 1.1: Bulk code creation with capacity limits (1-400)"
    echo "   • 2.1: Users can access via bulk codes when capacity allows"
    echo "   • 2.2: Usage counter increments on successful login"
    echo "   • 2.3: Capacity exceeded rejection with appropriate error"
    echo "   • 2.4: Atomic operations prevent race conditions"
    echo "   • 4.1: Automatic expiration and session cleanup"
    
    exit 0
else
    echo ""
    echo "❌ $FAILED_TESTS TEST(S) FAILED"
    echo ""
    echo "🔧 Troubleshooting Guide:"
    echo "1. Check Supabase database connection and permissions"
    echo "2. Verify all required database functions exist"
    echo "3. Ensure access_codes table has required columns:"
    echo "   - usage_count (integer, default 0)"
    echo "   - max_usage_count (integer, default 1)"
    echo "   - type (enum including 'bulk')"
    echo "4. Check that the Next.js application is running on the expected port"
    echo "5. Verify environment variables are correctly set"
    echo ""
    echo "For detailed error information, run individual test files:"
    echo "• node tests/run-database-tests.js"
    echo "• node tests/bulk-code-usage-api-tests.js"
    echo "• node tests/bulk-code-error-handling-tests.js"
    echo "• node tests/bulk-code-cleanup-tests.js"
    echo "• node tests/bulk-code-integration-tests.js"
    echo "• node tests/bulk-code-api-integration-tests.js"
    
    exit 1
fi