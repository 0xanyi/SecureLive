#!/bin/bash

# Production build script for Docker deployment
set -e

echo "🔧 Preparing production build..."

# Set environment variables
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building Next.js application..."
# Build with lenient settings for deployment
npm run build

echo "✅ Production build completed successfully!"

# Verify build output
if [ -d ".next" ]; then
    echo "✅ .next directory created"
else
    echo "❌ .next directory not found"
    exit 1
fi

if [ -f ".next/standalone/server.js" ]; then
    echo "✅ Standalone server.js created"
else
    echo "❌ Standalone server.js not found"
    exit 1
fi

echo "🎉 Build verification passed!"