# Deploy Edge Function - Critical Step

## Option 1: Using Supabase CLI with Token (Recommended)

1. **Get your Supabase Access Token:**
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Give it a name like "OCMA Deployment"
   - Copy the token

2. **Deploy the function:**
   ```bash
   export SUPABASE_ACCESS_TOKEN="your-token-here"
   npx supabase functions deploy test-platform-config --project-ref wxxjbkqnvpbjywejfrox
   ```

## Option 2: Using Supabase Dashboard (Manual)

1. Go to https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox/functions
2. Find the `test-platform-config` function
3. Click on it to edit
4. Copy the entire contents of these files:
   - `/workspaces/ocma/supabase/functions/test-platform-config/index.ts`
   - `/workspaces/ocma/supabase/functions/test-platform-config/twitter-oauth1.ts`
5. Paste the updated code and click "Deploy"

## Option 3: Using Supabase API Directly

```bash
# Replace YOUR_ACCESS_TOKEN with your Supabase access token
curl -X POST \
  https://api.supabase.com/v1/projects/wxxjbkqnvpbjywejfrox/functions/test-platform-config/deploy \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "verify_jwt": true,
  "import_map": true
}
EOF
```

## What This Deployment Fixes

This deployment adds OAuth 1.0a support to the Twitter/X integration, which:
- Allows posting tweets (OAuth 2.0 App-Only tokens cannot post)
- Provides a fallback when OAuth 2.0 tokens are invalid
- Uses the working OAuth 1.0a credentials already in your database

## After Deployment

Test that everything works:
1. Go to the OCMA Settings page
2. Select an organization
3. Click "Test Configuration" for Twitter - should show ✅
4. Try generating and posting content

## Project Details
- **Project ID:** wxxjbkqnvpbjywejfrox
- **Project URL:** https://wxxjbkqnvpbjywejfrox.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox