# Security Headers Implementation

This document describes the security headers implemented in the Daygent application.

## Overview

Security headers are configured in `next.config.ts` and are applied to all routes to protect against common web vulnerabilities.

## Implemented Headers

### 1. Content-Security-Policy (CSP)
Protects against XSS attacks by controlling which resources can be loaded.

**Configuration:**
- `default-src 'self'` - Only allow resources from same origin by default
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` - Required for Next.js functionality
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` - Allows inline styles and Google Fonts
- `font-src 'self' https://fonts.gstatic.com` - Allows Google Fonts
- `img-src 'self' data: blob:` - Allows images, data URLs, and blob URLs
- `connect-src 'self' [SUPABASE_URL]` - Allows API connections to Supabase
- `frame-ancestors 'none'` - Prevents clickjacking
- `base-uri 'self'` - Restricts base tag usage
- `form-action 'self'` - Restricts form submissions

### 2. X-Frame-Options: DENY
Prevents the application from being embedded in iframes, protecting against clickjacking attacks.

### 3. X-Content-Type-Options: nosniff
Prevents browsers from MIME-sniffing responses away from the declared content type.

### 4. Strict-Transport-Security
Forces connections over HTTPS with:
- `max-age=31536000` - 1 year
- `includeSubDomains` - Applies to all subdomains

### 5. Referrer-Policy: strict-origin-when-cross-origin
Controls how much referrer information is included with requests.

### 6. Permissions-Policy
Disables access to sensitive browser features:
- Camera
- Microphone
- Geolocation

## Testing

To verify headers are working:
```bash
curl -I https://yourdomain.com | grep -E "^(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
```

## Known Limitations

### CSP 'unsafe-inline' and 'unsafe-eval' 
These directives significantly weaken XSS protection but are currently required:

**Why 'unsafe-inline' is needed:**
- Next.js injects inline scripts for client-side hydration
- React DevTools requires inline scripts in development
- Tailwind CSS and other CSS-in-JS solutions use inline styles
- Third-party components may inject inline scripts/styles

**Why 'unsafe-eval' is needed:**
- Webpack uses eval() in development mode for hot module replacement
- Dynamic imports and code splitting may use eval-like constructs
- Some third-party libraries (e.g., certain JSON parsers) use eval()

### Development vs Production
The same CSP is used in both environments. Production should have stricter policies.

## Migration Plan to Nonce-based CSP

### Phase 1: Preparation (Current)
- Document all inline script/style usage
- Identify third-party dependencies using eval()
- Add comprehensive CSP violation reporting

### Phase 2: Implement Nonce Generation
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export function middleware(request: Request) {
  const nonce = crypto.randomBytes(16).toString('base64')
  const cspHeader = `
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
  `
  
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Nonce', nonce)
  
  return response
}
```

### Phase 3: Update Application Code
1. Pass nonce to all inline scripts via Next.js Script component
2. Update style tags to include nonce attribute
3. Replace eval() usage with safer alternatives
4. Update third-party integrations

### Phase 4: Testing & Rollout
1. Enable CSP report-only mode with nonce-based policy
2. Monitor violation reports
3. Fix any violations
4. Gradually roll out to production
5. Remove 'unsafe-inline' and 'unsafe-eval'

### Phase 5: Modern Browser Optimization
- Implement 'strict-dynamic' for modern browsers
- Use 'unsafe-inline' as fallback for older browsers
- Consider implementing Feature Policy/Permissions Policy

## Interim Security Measures

While 'unsafe-inline' and 'unsafe-eval' are present:
1. Implement strict input validation
2. Use React's built-in XSS protection
3. Sanitize all user-generated content
4. Regular security audits
5. Monitor for CSP violations