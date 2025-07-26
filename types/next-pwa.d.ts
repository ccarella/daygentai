declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface WorkboxConfig {
    swDest?: string;
    additionalManifestEntries?: Array<{
      url: string;
      revision: string | null;
    }>;
    exclude?: Array<string | RegExp>;
    excludeChunks?: string[];
    include?: Array<string | RegExp>;
    modifyURLPrefix?: Record<string, string>;
  }

  interface RuntimeCaching {
    urlPattern: RegExp | ((params: { url: URL; event: any }) => boolean);
    handler: 'CacheFirst' | 'CacheOnly' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
        purgeOnQuotaError?: boolean;
      };
      networkTimeoutSeconds?: number;
      plugins?: any[];
      precacheFallback?: {
        fallbackURL: string;
      };
      rangeRequests?: boolean;
    };
  }

  interface PWAConfig {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCaching[];
    buildExcludes?: Array<string | RegExp>;
    publicExcludes?: Array<string | RegExp>;
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    cacheOnFrontEndNav?: boolean;
    reloadOnOnline?: boolean;
    customWorkerDir?: string;
    workboxOptions?: WorkboxConfig;
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export = withPWA;
}