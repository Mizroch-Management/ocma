# Twitter/X Integration Fix Guide

## Current Issue
Twitter configuration test is failing even though OpenAI works.

## Common Problems & Solutions

### 1. Wrong Token Type
**Problem**: Using App-Only token instead of User Context OAuth 2.0 token
**Symptoms**: 403 Forbidden error, "lacks tweet.write scope"
**Solution**: You need a User Context OAuth 2.0 token, not an App-Only token

### 2. Missing Scopes
**Problem**: Token doesn't have tweet.write scope
**Symptoms**: Can read tweets but cannot post
**Solution**: Re-authenticate with proper scopes: `tweet.read tweet.write users.read`

### 3. Token Format Issues
**Problem**: Including "Bearer " prefix in the token field
**Solution**: Enter ONLY the token, not "Bearer YOUR_TOKEN"
- ❌ Wrong: `Bearer AAAAAAAAAAAAAAAAAAAAAMLheAAA...`
- ✅ Right: `AAAAAAAAAAAAAAAAAAAAAMLheAAA...`

### 4. Expired Token
**Problem**: OAuth 2.0 refresh token has expired
**Symptoms**: 401 Unauthorized error
**Solution**: Generate a new token

## How to Get the Correct Token

### Option 1: Using Twitter OAuth 2.0 Playground (Easiest)
1. Go to: https://oauth-playground.twitter.com/
2. Select OAuth 2.0
3. Choose scopes:
   - `tweet.read`
   - `tweet.write`
   - `users.read`
4. Complete the authorization flow
5. Copy the Access Token (not the Bearer Token if shown separately)

### Option 2: Using Your App's OAuth 2.0 Settings
1. Go to Twitter Developer Portal: https://developer.twitter.com/
2. Select your app
3. Go to "User authentication settings"
4. Set up OAuth 2.0 with:
   - Type of App: Web App
   - Callback URL: Your app URL
   - Website URL: Your website
5. Under "App permissions", select: Read and write
6. Generate tokens with proper scopes

### Option 3: Using Postman
1. Create new OAuth 2.0 request
2. Auth URL: `https://twitter.com/i/oauth2/authorize`
3. Token URL: `https://api.twitter.com/2/oauth2/token`
4. Scopes: `tweet.read tweet.write users.read offline.access`
5. Complete flow and copy access token

## Test Your Token

1. Edit `test-twitter-directly.js`:
```javascript
const BEARER_TOKEN = 'your_actual_token_here';
```

2. Run:
```bash
node test-twitter-directly.js
```

3. You should see:
- ✅ User authenticated
- ✅ Tweet created successfully
- ✅ Token has tweet.write scope

## In OCMA Settings

1. Go to Settings → Social Media
2. Click Configure for X (Twitter)
3. In "OAuth 2.0 Bearer Token" field, enter ONLY the token:
   - No "Bearer " prefix
   - Just the token string
4. Leave the Legacy OAuth 1.0a fields empty (optional)
5. Click Test Configuration

## What the Test Does

The OCMA test:
1. Creates a test tweet
2. Immediately deletes it
3. Verifies the token has proper permissions

## Still Not Working?

Run this to see the exact error:
```bash
node test-twitter-directly.js
```

Common error messages:
- `403: Forbidden` = Wrong scope
- `401: Unauthorized` = Invalid/expired token
- `429: Too Many Requests` = Rate limited
- Network error = Check internet connection

## Token Requirements Summary

✅ Must be OAuth 2.0 User Context token
✅ Must have tweet.write scope
✅ Must be valid (not expired)
✅ Enter without "Bearer " prefix
❌ Not App-Only token
❌ Not OAuth 1.0a tokens
❌ Not API keys alone