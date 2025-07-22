import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb', // Default for server actions
    },
  },
  // Note: Route-specific body size limits are handled via middleware
  // File uploads routes (/api/upload/*) allow up to 10MB
  // All other routes default to 1MB via serverActions.bodySizeLimit
  
  async headers() {
    // Get Supabase URL from environment for CSP
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : '';
    
    // Define CSP directives
    // WARNING: 'unsafe-inline' and 'unsafe-eval' are required by Next.js but weaken XSS protection
    // TODO: Implement nonce-based CSP for better security
    // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: blob:;
      connect-src 'self' ${supabaseUrl} https://${supabaseHost};
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim();
    
    // Note: 'unsafe-inline' is needed for:
    // - Next.js client-side navigation and hydration scripts
    // - React DevTools in development
    // - Styled components and CSS-in-JS solutions
    // 
    // 'unsafe-eval' is needed for:
    // - Next.js development mode (webpack)
    // - Dynamic imports and code splitting
    // - Some third-party libraries
    //
    // Migration plan:
    // 1. Implement CSP nonce generation in middleware
    // 2. Update all inline scripts to use nonces
    // 3. Replace 'unsafe-inline' with 'nonce-{generated}'
    // 4. Test thoroughly in development and production
    // 5. Consider 'strict-dynamic' for modern browsers
    
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
