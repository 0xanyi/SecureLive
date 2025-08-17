#!/bin/bash

# Bulk Code Usage API Tests Runner
# This script runs the comprehensive API tests for bulk code usage tracking

echo "🧪 Bulk Code Usage API Tests"
echo "============================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    echo "Please create .env.local with your Supabase configuration"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the tests
echo "🚀 Running bulk code usage API tests..."
node tests/bulk-code-usage-api-tests.js

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "🎉 All tests completed successfully!"
else
    echo ""
    echo "💥 Some tests failed. Check the output above for details."
fi

exit $exit_code