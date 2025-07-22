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
