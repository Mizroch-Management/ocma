#!/bin/bash

# Deploy Twitter OAuth 1.0a Fix to Supabase Edge Functions
# This script deploys the critical fix for Twitter/X integration

echo "========================================="
echo "OCMA Twitter/X Integration Deployment"
echo "========================================="
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set!"
    echo ""
    echo "To get your token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Name it 'OCMA Deployment'"
    echo "4. Copy the token"
    echo ""
    echo "Then run:"
    echo "  export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo "  ./deploy-twitter-fix.sh"
    echo ""
    exit 1
fi

echo "✅ Access token found"
echo ""
echo "📦 Deploying test-platform-config edge function..."
echo "   Project: wxxjbkqnvpbjywejfrox"
echo ""

# Deploy the function
npx supabase functions deploy test-platform-config \
    --project-ref wxxjbkqnvpbjywejfrox \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Edge function deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to OCMA Settings page"
    echo "2. Select an organization (eth 3, Smart ETH, or ScamDunk)"
    echo "3. Click 'Test Configuration' for Twitter"
    echo "4. It should now show ✅ and work properly"
    echo ""
    echo "The Twitter/X integration now supports:"
    echo "- OAuth 2.0 with User Context tokens"
    echo "- OAuth 1.0a fallback for posting tweets"
    echo "- Automatic detection of App-Only vs User Context tokens"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Please check:"
    echo "1. Your access token is valid"
    echo "2. You have permission to deploy to this project"
    echo "3. Try the manual deployment via Supabase Dashboard:"
    echo "   https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox/functions"
fi