# OCMA API Documentation

## Overview
OCMA uses Vercel serverless functions for all API endpoints. All endpoints require authentication unless specified otherwise.

## Authentication
All API requests must include a Bearer token in the Authorization header:
```
Authorization: Bearer <your-auth-token>
```

## Base URL
- Development: `http://localhost:5173/api`
- Production: `https://your-app.vercel.app/api`

## Endpoints

### Configuration

#### GET /api/config
Returns application capabilities without exposing secrets.

**Response:**
```json
{
  "aiEnabled": true,
  "imageEnabled": true,
  "connectedChannels": {
    "twitter": true,
    "facebook": false,
    "instagram": false,
    "linkedin": true,
    "telegram": false,
    "discord": false
  },
  "schedulingEnabled": true,
  "analyticsEnabled": true
}
```

### Authentication

#### GET /api/auth/callback
OAuth callback handler for Supabase authentication.

**Query Parameters:**
- `code`: Authorization code from OAuth provider
- `state`: State parameter for security

**Response:**
- Redirects to dashboard on success
- Redirects to `/auth?error=<message>` on failure

### AI Generation

#### POST /api/ai/generate
Generate content using AI models.

**Request Body:**
```json
{
  "prompt": "Create a post about productivity",
  "platform": "twitter",
  "tone": "professional",
  "maxTokens": 500
}
```

**Response:**
```json
{
  "success": true,
  "variants": [
    "Content variant 1...",
    "Content variant 2...",
    "Content variant 3..."
  ],
  "usage": {
    "promptTokens": 50,
    "completionTokens": 450
  }
}
```

### Social Media Connectors

#### GET /api/connect/twitter
Initiates Twitter OAuth flow.

**Response:**
- Redirects to Twitter authorization page

#### POST /api/connect/twitter
Completes Twitter OAuth flow and stores tokens.

**Request Body:**
```json
{
  "code": "auth_code_from_twitter",
  "state": "state_parameter"
}
```

**Response:**
```json
{
  "success": true,
  "username": "user_handle",
  "message": "Twitter account connected successfully"
}
```

#### GET /api/connect/health
Check health status of all connected social accounts.

**Response:**
```json
{
  "connectors": [
    {
      "platform": "twitter",
      "connected": true,
      "username": "user_handle",
      "expiresAt": "2024-01-01T00:00:00Z",
      "lastSuccessfulPost": "2023-12-01T00:00:00Z",
      "scopes": ["tweet.read", "tweet.write"],
      "error": null
    }
  ],
  "summary": {
    "total": 6,
    "connected": 2,
    "expired": 0
  }
}
```

#### POST /api/connect/test-post
Send a test post to verify connection.

**Request Body:**
```json
{
  "platform": "twitter",
  "message": "Test message (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test successful! Twitter connection is working.",
  "postId": "test_123456789"
}
```

### Content Posting

#### POST /api/post/twitter
Post content to Twitter.

**Request Body:**
```json
{
  "content": "Your tweet content here",
  "mediaUrls": ["https://example.com/image.jpg"],
  "scheduledFor": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "postId": "tweet_id",
  "url": "https://twitter.com/username/status/tweet_id"
}
```

### Job Queue

#### POST /api/jobs/schedule
Schedule a job for later execution.

**Request Body:**
```json
{
  "type": "post",
  "platform": "twitter",
  "payload": {
    "content": "Scheduled content"
  },
  "scheduledFor": "2024-01-01T12:00:00Z",
  "retryConfig": {
    "maxAttempts": 3,
    "backoffMultiplier": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_123456789_abc",
  "scheduledFor": "2024-01-01T12:00:00Z",
  "status": "scheduled"
}
```

#### POST /api/jobs/process
Process pending jobs (called by cron or QStash).

**Request Body (optional):**
```json
{
  "jobId": "specific_job_id"
}
```

**Response:**
```json
{
  "processed": 5,
  "results": [
    {
      "jobId": "job_123",
      "success": true,
      "result": {}
    }
  ]
}
```

## Error Responses

All endpoints use consistent error response format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "details": {} // Optional additional error details
}
```

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing or invalid auth)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `405`: Method Not Allowed
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate limited:
- AI Generation: 100 requests per hour
- Social Posting: 300 requests per hour
- Other endpoints: 1000 requests per hour

## Webhooks

OCMA can send webhooks for certain events:

### Post Published
```json
{
  "event": "post.published",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "postId": "123",
    "platform": "twitter",
    "url": "https://twitter.com/..."
  }
}
```

### Post Failed
```json
{
  "event": "post.failed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "postId": "123",
    "platform": "twitter",
    "error": "Rate limited"
  }
}
```