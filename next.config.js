const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb', // Default for server actions
    },
  },
  // Note: Route-specific body size limits are handled via middleware
  // File uploads routes (/api/upload/*) allow up to 10MB
  // All other routes default to 1MB via serverActions.bodySizeLimit
};

module.exports = nextConfig;
