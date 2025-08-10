#!/bin/bash

# Production startup script for Coolify deployment
set -e

echo "🚀 Starting Live Streaming Portal..."

# Check if required environment variables are set
required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "JWT_SECRET"
    "NEXT_PUBLIC_APP_URL"
)

echo "🔍 Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

# Set production defaults
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "🌍 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"
echo "🏠 Hostname: $HOSTNAME"

# Start the application
echo "🎬 Starting Next.js application..."
exec node server.js