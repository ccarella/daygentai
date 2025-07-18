export function getURL() {
  // Check if we're in production and have a custom domain
  if (process.env['NEXT_PUBLIC_SITE_URL']) {
    return process.env['NEXT_PUBLIC_SITE_URL'];
  }
  
  // Check if we're on Vercel (preview or production without custom domain)
  if (process.env['VERCEL_URL']) {
    return `https://${process.env['VERCEL_URL']}`;
  }
  
  // We're on localhost
  return 'http://localhost:3000';
}