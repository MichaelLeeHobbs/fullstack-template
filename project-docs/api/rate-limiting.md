# Rate Limiting

> **[Template]** This covers the base template feature. Extend or modify for your project.

The API uses rate limiting to protect against brute-force attacks, abuse, and resource exhaustion. Rate limits are enforced per-IP using [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit).

## Rate Limit Tiers

| Tier | Endpoints | Max Requests | Window | Purpose |
|------|-----------|-------------|--------|---------|
| **Registration** | `POST /auth/register` | 5 | 1 hour | Prevent mass account creation |
| **Auth** | `POST /auth/login`, `POST /mfa/verify` | 5 | 15 minutes | Prevent credential brute-forcing |
| **Password Reset** | `POST /account/forgot-password`, `POST /account/resend-verification-public` | 3 | 1 hour | Prevent email spam and abuse |
| **General API** | All other endpoints | 100 | 1 minute | General abuse protection |
| **API Key** | API key-authenticated requests | 60 | 1 minute | Per-key/IP throttling |

## How Rate Limits Work

### Per-IP Tracking

By default, rate limits are tracked per client IP address. When the API is behind a reverse proxy (NGINX, CloudFlare), ensure the `trust proxy` Express setting is configured so that the real client IP is used rather than the proxy IP.

### API Key Rate Limiting

For requests authenticated with an API key (`X-API-Key` header), the rate limit uses the API key ID as the tracking key instead of the IP address. This means each API key gets its own rate limit budget independent of the IP.

### Sliding Window

Rate limits use a fixed window. For example, with a 15-minute window and a 5-request limit:
- The window starts at the time of the first request.
- Once 5 requests have been made within that window, subsequent requests are rejected until the window resets.

## Response Headers

All API responses include standard rate limit headers (per [RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585)):

| Header | Description | Example |
|--------|-------------|---------|
| `RateLimit-Limit` | Maximum requests allowed in the window | `100` |
| `RateLimit-Remaining` | Requests remaining in the current window | `95` |
| `RateLimit-Reset` | Seconds until the window resets | `42` |

Legacy headers (`X-RateLimit-*`) are disabled. Only the standard headers specified in the [RateLimit header fields draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) are sent.

## Rate Limit Exceeded Response

When a client exceeds the rate limit, the API responds with `429 Too Many Requests`:

```json
{
  "success": false,
  "error": "Too many login attempts. Please try again in 15 minutes."
}
```

The error message varies by tier:

| Tier | Error Message |
|------|---------------|
| Registration | "Too many accounts created. Please try again later." |
| Auth | "Too many login attempts. Please try again in 15 minutes." |
| Password Reset | "Too many password reset requests. Please try again later." |
| General API | "Too many requests. Please slow down." |
| API Key | "Too many API key requests. Please slow down." |

## Best Practices for API Consumers

### Handling 429 Responses

1. **Check headers**: Read `RateLimit-Remaining` proactively to avoid hitting limits.
2. **Back off**: When you receive a 429, wait at least `RateLimit-Reset` seconds before retrying.
3. **Exponential backoff**: For automated systems, implement exponential backoff with jitter.

### Example: Retry with Backoff

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const resetSeconds = parseInt(response.headers.get('RateLimit-Reset') || '60', 10);
      const waitMs = resetSeconds * 1000 + Math.random() * 1000; // Add jitter
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

### Token Refresh Strategy

To minimize auth endpoint usage:
- Cache the access token and reuse it until it expires.
- Only call `POST /auth/refresh` when you receive a 401 from a protected endpoint.
- Do not preemptively refresh on every request.

## Customizing Rate Limits

Rate limiters are defined in `apps/api/src/middleware/rateLimit.middleware.ts`. To adjust limits for your project:

```typescript
// Example: Increase login attempts for development
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // Increase from 5 to 10
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Adding Rate Limits to New Endpoints

To add rate limiting to a new route:

```typescript
import { apiRateLimiter } from '../middleware/rateLimit.middleware.js';

router.post('/my-endpoint', apiRateLimiter, MyController.handler);
```

Or create a custom limiter for specific requirements:

```typescript
import rateLimit from 'express-rate-limit';

const customLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,
  message: {
    success: false,
    error: 'Rate limit exceeded for this operation.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```
