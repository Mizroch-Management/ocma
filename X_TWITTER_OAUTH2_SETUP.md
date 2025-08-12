# X (Twitter) OAuth 2.0 Setup Guide

## Issue Fixed
The error you encountered ("unable and something to do with OAuth 2.0") has been resolved. The system now properly handles X/Twitter OAuth 2.0 authentication.

## What Changed
1. **Updated test configuration**: The test now properly validates OAuth 2.0 tokens with the `tweet.write` scope
2. **Improved error messages**: Clear feedback about missing scopes or invalid tokens
3. **Updated UI labels**: Better guidance for OAuth 2.0 setup in the Settings page

## How to Get Your X OAuth 2.0 Token

### Step 1: Access Twitter Developer Portal
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your X/Twitter account

### Step 2: Create or Select an App
1. Create a new app or select an existing one
2. Navigate to your app's settings

### Step 3: Enable OAuth 2.0
1. Go to "User authentication settings"
2. Click "Set up" or "Edit"
3. Enable **OAuth 2.0**
4. Configure the following:
   - **Type of App**: Select "Web App, Automated App or Bot"
   - **Callback URL**: Add your application's redirect URL (e.g., `https://yourapp.com/auth/callback`)
   - **Website URL**: Your application URL

### Step 4: Set Required Scopes
**IMPORTANT**: Select these scopes for posting functionality:
- ✅ `tweet.read` - Read tweets
- ✅ `tweet.write` - Post tweets (REQUIRED for posting)
- ✅ `users.read` - Read user profile information
- ✅ `offline.access` - Get refresh tokens for long-lived access

### Step 5: Generate OAuth 2.0 Token
There are two methods:

#### Method A: Using OAuth 2.0 Flow (Recommended)
1. Implement the OAuth 2.0 authorization flow in your app
2. Direct users to: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=STATE&code_challenge=CHALLENGE&code_challenge_method=S256`
3. Exchange the authorization code for an access token

#### Method B: Using Postman or Similar Tool
1. Use Postman's OAuth 2.0 authorization helper
2. Configure with your app's credentials
3. Set scopes: `tweet.read tweet.write users.read offline.access`
4. Complete the authorization flow to get your bearer token

### Step 6: Add Token to OCMA
1. Go to Settings in OCMA
2. Find X (Twitter) in the Social Media section
3. Click "Configure"
4. Paste your OAuth 2.0 Bearer Token in the first field
5. Click "Test Configuration" to verify

## Troubleshooting

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Token lacks tweet.write scope" | Token doesn't have posting permissions | Re-authenticate with `tweet.write` scope included |
| "OAuth 2.0 token is invalid or expired" | Token has expired or is incorrect | Generate a new token with proper scopes |
| "403 Forbidden" | Missing required scopes | Ensure all required scopes are selected during OAuth flow |
| "401 Unauthorized" | Invalid token | Check token is correctly copied and hasn't expired |

### Token Validation
When you test your configuration, OCMA will:
1. Attempt to create a test tweet
2. Immediately delete it (to keep your timeline clean)
3. Confirm your token has the necessary permissions

## Security Best Practices
- **Never share your bearer token** publicly
- **Rotate tokens regularly** for security
- **Use environment variables** in production
- **Limit scope access** to only what's needed

## Need Help?
If you continue to experience issues:
1. Verify your app has been approved for the required access level
2. Check that OAuth 2.0 is enabled in your app settings
3. Ensure all required scopes are selected
4. Try regenerating your tokens

## Additional Resources
- [X API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 2.0 Authentication](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Managing Access Tokens](https://developer.twitter.com/en/docs/authentication/oauth-2-0/user-access-token)