/**
 * Validates if a URL is safe to use as an image source
 * Prevents XSS attacks by ensuring only valid HTTP(S) image URLs are used
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Additional checks to prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || 
        url.toLowerCase().includes('data:') ||
        url.toLowerCase().includes('vbscript:')) {
      return false;
    }
    
    // Ensure the URL has a valid hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return false;
    }
    
    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes a URL for safe usage in img src
 * Returns null if the URL is invalid
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (isValidImageUrl(url)) {
    return url!;
  }
  return null;
}