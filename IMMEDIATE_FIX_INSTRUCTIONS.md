# IMMEDIATE FIX FOR SETTINGS NOT SAVING

## Root Cause
The Settings page cannot save OpenAI API keys or Twitter credentials because:
1. The database has Row Level Security (RLS) policies that require authentication
2. Settings require organization membership or specific roles
3. There are NO settings currently stored in the database

## Immediate Fix (Do This Now)

### Option 1: Use Supabase Dashboard (EASIEST)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox
2. Navigate to **Table Editor** > **system_settings**
3. Click **Insert row** and add:

#### For OpenAI:
```json
{
  "setting_key": "openai_api_key",
  "setting_value": {"api_key": "YOUR_OPENAI_API_KEY_HERE"},
  "category": "ai_platforms",
  "description": "OpenAI API Key",
  "organization_id": null
}
```

#### For Twitter/X:
```json
{
  "setting_key": "twitter_integration",
  "setting_value": {
    "connected": true,
    "credentials": {
      "bearer_token": "YOUR_TWITTER_BEARER_TOKEN_HERE",
      "api_key": "",
      "api_secret": "",
      "access_token": "",
      "access_token_secret": ""
    },
    "verified": true
  },
  "category": "integration",
  "description": "Twitter/X Integration",
  "organization_id": null
}
```

### Option 2: Fix RLS Policies (PERMANENT SOLUTION)
1. Go to Supabase Dashboard > **SQL Editor**
2. Run this SQL to fix the RLS policies:

```sql
-- Allow authenticated users to manage global settings
DROP POLICY IF EXISTS "Authenticated users can manage global settings" ON public.system_settings;

CREATE POLICY "Authenticated users can manage global settings" 
ON public.system_settings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL
);
```

3. After running this, the Settings page should work normally

## Testing Your Fix

After adding the settings, test them:

1. **Test OpenAI**: Try generating content
2. **Test Twitter**: Click "Test Configuration" in Settings

## Important Notes

### For Twitter/X Token:
- You need a **User Context OAuth 2.0 token**, NOT an App-Only token
- The token must have `tweet.write` scope
- Use Postman to get the correct token (see X_TWITTER_OAUTH2_SETUP.md)

### For OpenAI:
- Get your API key from: https://platform.openai.com/api-keys
- Make sure it starts with `sk-proj-` or `sk-`
- Ensure you have credits/billing set up

## Why This Happened
The app expects users to:
1. Be logged in
2. Be part of an organization
3. Have proper roles (owner/admin)

But the current RLS policies are too restrictive for initial setup.

## Next Steps
After fixing:
1. Login to the OCMA app
2. Go to Settings
3. Your keys should now be visible
4. Test both integrations
5. If they work, you can now generate content and post to Twitter/X