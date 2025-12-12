# Security Documentation

## Security Fix: API Key Protection (December 2025)

### Issue Identified

**HIGH SEVERITY**: The Gemini API key was previously embedded directly in the client-side JavaScript bundle through Vite's `define` configuration. This exposed the API key to anyone visiting the website, allowing:

- Unauthorized use of the API key
- Potential financial costs from API abuse
- Quota exhaustion
- Terms of Service violations

### Solution Implemented

We've implemented a secure **backend API layer** architecture:

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Browser   │───────▶│   Backend   │───────▶│  Gemini API │
│  (Frontend) │        │  (Express)  │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
     Public              API Key stored         External API
   No Secrets            Server-side only
```

### Changes Made

1. **Backend Server** (`server/index.js`):
   - Express.js server handling API requests
   - CORS protection limiting frontend origins
   - Rate limiting (10 requests per minute per IP)
   - Input sanitization
   - Secure error handling

2. **API Service Migration** (`server/services/geminiService.js`):
   - Moved all Gemini API logic to server-side
   - API key accessed via environment variables only
   - Retry logic and error handling preserved

3. **Frontend Updates** (`services/geminiService.ts`):
   - Removed direct Gemini API calls
   - Now calls backend API endpoint
   - Handles rate limiting gracefully

4. **Configuration Security** (`vite.config.ts`):
   - Removed API key from client bundle
   - No sensitive data exposed to browser

### Security Features

#### Rate Limiting
- 10 requests per minute per IP address
- Prevents API abuse and DoS attempts
- Returns 429 status when exceeded

#### Input Validation
- Handle input sanitized (max 50 characters)
- Type checking on all inputs
- Prevents injection attacks

#### CORS Protection
- Only configured frontend origin allowed
- Prevents unauthorized cross-origin requests

#### Environment Separation
- Backend: `.env` (server secrets)
- Frontend: `.env.local` (public config only)
- Example files provided for setup

### Deployment Recommendations

#### For Production

1. **Environment Variables**:
   ```bash
   CRYPTOTRUTH_GEMINI_API_KEY=your_actual_key
   PORT=3001
   FRONTEND_URL=https://yourdomain.com
   ```

2. **HTTPS Only**: Always use HTTPS in production

3. **Enhanced Rate Limiting**: Consider using Redis-based rate limiting for production scale

4. **API Key Rotation**: Regularly rotate your Gemini API key

5. **Monitoring**: Set up logging and monitoring for:
   - Failed authentication attempts
   - Rate limit hits
   - Unusual API usage patterns

6. **Firewall Rules**: Restrict backend API access to only your frontend domain

#### For Development

1. Copy `.env.example` to `.env` and add your API key
2. Copy `.env.local.example` to `.env.local`
3. Never commit `.env` or `.env.local` files

### Additional Security Notes

#### CVE-2025-55184 & CVE-2025-55183 (React Server Components)

These vulnerabilities **DO NOT** affect this application because:
- This is a Vite-based client-side React application (not Next.js)
- No React Server Components are used
- No Next.js App Router is present
- No Server Actions exist in the codebase

These CVEs specifically target Next.js RSC implementations.

### Security Checklist

- [x] API keys removed from client bundle
- [x] Backend API layer implemented
- [x] Rate limiting enabled
- [x] Input validation implemented
- [x] CORS protection configured
- [x] Environment variable separation
- [x] Error messages don't leak sensitive info
- [x] HTTPS recommended for production
- [ ] Set up API key rotation policy (manual)
- [ ] Configure production monitoring (manual)
- [ ] Set up backup API keys (manual)

### Reporting Security Issues

If you discover a security vulnerability, please report it by:
1. **DO NOT** open a public GitHub issue
2. Contact the maintainer directly
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

### References

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Vite Security](https://vitejs.dev/guide/env-and-mode.html#env-files)
