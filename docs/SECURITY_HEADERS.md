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

1. **CSP 'unsafe-inline' and 'unsafe-eval'**: Required by Next.js for:
   - Inline script injection for hydration
   - Dynamic imports and code splitting
   - Development mode features

2. **Development vs Production**: The same CSP is used in both environments. Consider stricter policies for production.

## Future Improvements

1. Implement nonce-based CSP for stricter script control
2. Add CSP report-uri for violation monitoring
3. Gradually increase HSTS max-age
4. Environment-specific CSP policies