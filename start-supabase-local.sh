#!/bin/bash

# OCMA Supabase Local Development Setup Script
# This script starts Supabase locally and ensures edge functions can be tested

set -e

echo "🚀 Starting OCMA Supabase Local Environment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "📦 Install it with: npm install -g supabase"
    echo "🔗 Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop any existing Supabase instance
echo "🛑 Stopping any existing Supabase instance..."
supabase stop || true

# Start Supabase with edge functions
echo "🏁 Starting Supabase with edge functions..."
supabase start

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Get the local URLs
SUPABASE_URL=$(supabase status --output json | jq -r '.API_URL')
SUPABASE_ANON_KEY=$(supabase status --output json | jq -r '.ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY=$(supabase status --output json | jq -r '.SERVICE_ROLE_KEY')

echo ""
echo "✅ Supabase is running locally!"
echo ""
echo "📋 Local Environment Details:"
echo "   API URL: $SUPABASE_URL"
echo "   Anon Key: $SUPABASE_ANON_KEY"
echo "   Studio URL: http://localhost:54323"
echo ""

# Create or update .env.local file
echo "📝 Creating/updating .env.local file..."
cat > .env.local << EOF
# Local Supabase Environment
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Local development flag
VITE_ENVIRONMENT=local
EOF

echo "✅ .env.local file created with local Supabase credentials"

# Test edge functions
echo ""
echo "🧪 Testing edge functions..."

# Test a simple edge function to make sure they're working
FUNCTION_URL="$SUPABASE_URL/functions/v1/test-platform-config"
echo "   Function URL: $FUNCTION_URL"

# Check if functions are accessible (expect CORS error but that's ok)
if curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL" | grep -q "404\|405\|200"; then
    echo "✅ Edge functions are accessible"
else
    echo "⚠️  Edge functions might need manual deployment"
    echo "   Run: supabase functions deploy"
fi

echo ""
echo "🎯 Next Steps:"
echo "   1. Start your development server: npm run dev"
echo "   2. Visit Studio: http://localhost:54323"
echo "   3. Test your app at: http://localhost:5173"
echo ""
echo "🛠️  Useful Commands:"
echo "   - Deploy functions: supabase functions deploy"
echo "   - View logs: supabase functions logs"
echo "   - Stop Supabase: supabase stop"
echo "   - Reset database: supabase db reset"
echo ""
echo "📖 For more info: https://supabase.com/docs/guides/cli/local-development"