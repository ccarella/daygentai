import { describe, it, expect } from 'vitest';
import { isValidImageUrl, sanitizeImageUrl } from './url-validation';

describe('URL Validation', () => {
  describe('isValidImageUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(isValidImageUrl('http://example.com/image.png')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should reject invalid protocols', () => {
      expect(isValidImageUrl('javascript:alert("XSS")')).toBe(false);
      expect(isValidImageUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
      expect(isValidImageUrl('vbscript:msgbox("XSS")')).toBe(false);
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidImageUrl('not a url')).toBe(false);
      expect(isValidImageUrl('http://')).toBe(false);
      expect(isValidImageUrl('https://')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isValidImageUrl(null)).toBe(false);
      expect(isValidImageUrl(undefined)).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
    });

    it('should reject URLs with embedded javascript', () => {
      expect(isValidImageUrl('http://example.com/javascript:alert("XSS")')).toBe(false);
      expect(isValidImageUrl('https://example.com#javascript:alert("XSS")')).toBe(false);
    });
  });

  describe('sanitizeImageUrl', () => {
    it('should return valid URLs unchanged', () => {
      expect(sanitizeImageUrl('https://example.com/avatar.png')).toBe('https://example.com/avatar.png');
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeImageUrl('javascript:alert("XSS")')).toBe(null);
      expect(sanitizeImageUrl(null)).toBe(null);
      expect(sanitizeImageUrl(undefined)).toBe(null);
    });
  });
});