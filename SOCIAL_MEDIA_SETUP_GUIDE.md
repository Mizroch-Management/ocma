# Social Media Integration Setup Guide for OCMA

## Overview
This guide will help you properly configure social media integrations for OCMA. The app has been updated with improved API handling, better error messages, and automatic credential validation.

## Quick Fixes Applied
1. ✅ **Twitter/X**: Fixed OAuth 1.0a signature generation and endpoint URLs
2. ✅ **LinkedIn**: Added automatic person/organization ID fetching
3. ✅ **Facebook**: Improved page token handling and error messages
4. ✅ **Instagram**: Added media upload support (required for Instagram)
5. ✅ **YouTube**: Added token refresh mechanism

## Platform-Specific Setup Instructions

### 🐦 X (Twitter) Setup

#### ⚠️ Important: OAuth 2.0 Required
X/Twitter now requires OAuth 2.0 with proper scopes for posting. The legacy OAuth 1.0a is being phased out.

#### Required Credentials (OAuth 2.0):
- **OAuth 2.0 Bearer Token** with `tweet.write` and `users.read` scopes (REQUIRED)

#### How to Get OAuth 2.0 Credentials:
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or select existing one
3. Enable OAuth 2.0:
   - Go to "User authentication settings"
   - Enable OAuth 2.0
   - Set Type of App: "Web App, Automated App or Bot"
   - Add Callback URL (your app's redirect URL)
   - Select Required Scopes:
     - `tweet.read` - Read tweets
     - `tweet.write` - Post tweets (REQUIRED for posting)
     - `users.read` - Read user info
     - `offline.access` - For refresh tokens
4. Generate OAuth 2.0 tokens:
   - Use the OAuth 2.0 flow to get user authorization
   - Exchange authorization code for access token
   - The bearer token must have `tweet.write` scope

#### Legacy OAuth 1.0a (Optional - Being Deprecated):
- API Key (Consumer Key)
- API Secret (Consumer Secret)  
- Access Token
- Access Token Secret

#### Common Issues:
- **"OAuth 2.0 error"**: Token lacks `tweet.write` scope - re-authenticate with proper scopes
- **"Unauthorized"**: Token expired or invalid - regenerate OAuth 2.0 token
- **"403 Forbidden"**: Missing required scopes - ensure `tweet.write` is included
- **401 Error**: Invalid or expired token - re-authenticate

### 📘 Facebook Setup

#### Required Credentials:
- **App ID**
- **App Secret**
- **Page Access Token** (recommended) or User Access Token
- **Page ID**

#### How to Get Credentials:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create app (Business type)
3. Add Facebook Login product
4. Get App ID and Secret from Settings > Basic
5. For Page Access Token:
   - Use [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select your app
   - Request permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
   - Get User Token → Exchange for Page Token
6. Get Page ID from your Facebook Page > About section

#### Generating Long-Lived Page Access Token:
```bash
# Step 1: Exchange short-lived user token for long-lived user token
curl -i -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-user-token}"

# Step 2: Get Page Access Token
curl -i -X GET "https://graph.facebook.com/v19.0/{page-id}?fields=access_token&access_token={long-lived-user-token}"
```

### 📷 Instagram Setup

#### Required Credentials:
- **Access Token** (Instagram Business Account token)
- **User ID** (Instagram Business Account ID)
- **Business Account ID**
- **Connected Facebook Page ID**

#### How to Get Credentials:
1. Convert Instagram to Business/Creator Account
2. Connect to Facebook Page
3. Use same Facebook app as above
4. Add Instagram Basic Display or Instagram Graph API
5. Get Instagram Business Account ID:
   ```bash
   curl -X GET "https://graph.facebook.com/v19.0/{facebook-page-id}?fields=instagram_business_account&access_token={page-access-token}"
   ```
6. Use the same access token as Facebook Page

**Note**: Instagram requires media (images/videos) for posts. Text-only posts are not supported.

### 💼 LinkedIn Setup

#### Required Credentials:
- **Client ID**
- **Client Secret**
- **Access Token**
- **Person ID** (auto-fetched)
- **Organization ID** (optional, for company pages)

#### How to Get Credentials:
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create app
3. Add products: "Share on LinkedIn" and "Sign In with LinkedIn"
4. Get Client ID and Secret from Auth tab
5. For Access Token:
   - Set redirect URI: `https://ocma.dev/auth/linkedin/callback`
   - Use OAuth 2.0 flow with scopes: `r_liteprofile`, `w_member_social`
6. **Person ID**: Click "Auto-fetch LinkedIn IDs" button in OCMA settings

#### OAuth 2.0 Flow:
```bash
# Step 1: Get authorization code (open in browser)
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=r_liteprofile%20w_member_social

# Step 2: Exchange code for access token
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code' \
  -d 'code={authorization_code}' \
  -d 'client_id={client_id}' \
  -d 'client_secret={client_secret}' \
  -d 'redirect_uri={redirect_uri}'
```

### 📺 YouTube Setup

#### Required Credentials:
- **Client ID** (Google OAuth)
- **Client Secret**
- **Refresh Token**
- **Channel ID**
- **API Key** (optional)

#### How to Get Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Set redirect URI: `https://ocma.dev/auth/youtube/callback`
6. Get refresh token using OAuth 2.0 playground or your own flow
7. Get Channel ID from YouTube Studio > Settings > Channel > Advanced settings

**Note**: Community posts via API have limited availability. Consider video uploads instead.

## Testing Your Configuration

### In OCMA Settings:
1. Navigate to Settings > Social Media
2. Click "Configure" for each platform
3. Enter your credentials
4. For LinkedIn: Click "Auto-fetch LinkedIn IDs" after entering access token
5. Click "Test Configuration" to verify

### Test Post Format:
```json
{
  "content": "Test post from OCMA - {timestamp}",
  "platforms": ["facebook", "twitter", "linkedin"],
  "media_urls": ["https://example.com/image.jpg"]  // Required for Instagram
}
```

## Troubleshooting

### General Issues:
- **Clear browser cache** if settings don't save
- **Check API rate limits** for each platform
- **Verify webhook URLs** if using real-time features
- **Check token expiration** and refresh if needed

### Platform-Specific Errors:

#### Twitter/X:
- **Error 403**: Need Elevated access
- **Error 401**: Invalid credentials, regenerate tokens
- **Error 429**: Rate limited, wait and retry

#### Facebook/Instagram:
- **Error 190**: Token expired, generate new one
- **Error 200**: Permission denied, check app review status
- **Error 100**: Invalid parameter, check Page ID

#### LinkedIn:
- **Error 401**: Token expired, refresh OAuth token
- **Error 403**: Missing permissions, re-authorize with correct scopes

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for production
3. **Rotate tokens regularly**
4. **Use long-lived tokens** where available
5. **Implement token refresh** mechanisms
6. **Monitor API usage** to detect anomalies

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Review Supabase Edge Function logs
3. Verify all credentials are correctly formatted (no extra spaces)
4. Ensure your app has the required permissions on each platform
5. Contact platform support for API-specific issues

## Next Steps

After successful configuration:
1. Create test posts to verify integration
2. Set up scheduled posting
3. Configure platform-specific optimizations
4. Monitor analytics and engagement
5. Set up error notifications

---

Last Updated: 2025-08-09
Version: 2.0