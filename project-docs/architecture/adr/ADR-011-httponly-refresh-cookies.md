# ADR-011: HttpOnly Refresh Token Cookies

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | auth, security, cookies, xss |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The dual-token authentication system (ADR-003) requires a storage mechanism for the refresh token on the client side. The refresh token is long-lived (7 days) and grants the ability to obtain new access tokens, making it the most sensitive client-side credential. If an attacker obtains the refresh token via XSS (cross-site scripting), they can silently maintain access to the account even after the user changes their password (until the refresh token is explicitly revoked). The storage choice must minimize exposure to JavaScript-based attacks while remaining compatible with the application's CORS and cookie configuration.

## Decision

Store the refresh token in an **HttpOnly, Secure, SameSite=Strict** cookie. The access token remains in Zustand (JavaScript memory) for API request headers.

Cookie configuration:
- **HttpOnly**: JavaScript cannot read or write the cookie, eliminating XSS-based token theft
- **Secure**: Cookie is only sent over HTTPS connections (enforced in production)
- **SameSite=Strict**: Cookie is not sent on cross-origin requests, mitigating CSRF attacks
- **Path=/api/auth**: Cookie is only sent to authentication endpoints (`/auth/refresh`, `/auth/logout`), not every API request
- **Max-Age**: Matches the refresh token lifetime (7 days)

The server sets the cookie in the `Set-Cookie` response header during login and refresh. The server clears the cookie on logout. The frontend never directly handles the refresh token value -- it calls `/auth/refresh` and the browser automatically includes the cookie.

**Access token storage**: The access token is stored in the Zustand auth store (JavaScript memory). It is intentionally accessible to JavaScript because it must be read and attached as an `Authorization: Bearer` header on every API request. Its short lifetime (15 minutes) limits the exposure window if exfiltrated via XSS.

## Consequences

### Positive

- XSS attacks cannot steal the refresh token -- `HttpOnly` makes it invisible to JavaScript
- `SameSite=Strict` prevents CSRF attacks that attempt to use the cookie cross-origin
- `Path=/api/auth` scoping means the cookie is not sent with every API request, reducing unnecessary header overhead
- The browser handles cookie lifecycle (setting, sending, expiry) automatically -- no manual token storage code
- Refresh token rotation (issuing a new refresh token on each use) is trivially implementable with cookie replacement

### Negative

- Cookies require careful CORS configuration -- `credentials: 'include'` must be set on fetch requests, and the server must respond with `Access-Control-Allow-Credentials: true`
- Development with different origins (Vite on port 5173, API on port 3000) requires proxy configuration or relaxed SameSite settings in development
- Cookie size limits (~4KB) are not a concern for refresh tokens but would be for larger payloads
- Mobile native apps or non-browser clients cannot use HttpOnly cookies and need an alternative token delivery mechanism
- `SameSite=Strict` can cause the cookie to be missing on navigations from external links (e.g., clicking a link in an email), though this only affects the refresh endpoint

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| localStorage | Simple API, persists across tabs | Accessible to JavaScript (XSS vulnerable), never expires automatically | Rejected |
| sessionStorage | Tab-scoped, slightly less XSS surface | Still JavaScript-accessible, lost on tab close, no cross-tab sharing | Rejected |
| In-memory only (both tokens) | Maximum XSS protection | Tokens lost on page refresh, forces re-authentication constantly | Rejected |
| IndexedDB with encryption | Can encrypt at rest | JavaScript-accessible (encryption key also in JS), complex API | Rejected |
| **HttpOnly cookie (refresh) + memory (access)** | Refresh token immune to XSS, access token short-lived in memory | Cookie CORS complexity, not suitable for native apps | **Selected** |
