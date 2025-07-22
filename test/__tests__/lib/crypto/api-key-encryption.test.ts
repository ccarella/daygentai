import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptApiKey,
  decryptApiKey,
  getEncryptionSecret,
  isEncryptedApiKey
} from '@/lib/crypto/api-key-encryption';

describe('API Key Encryption', () => {
  const testSecret = 'test-secret-key-that-is-at-least-32-characters-long';
  const testApiKey = 'sk-test1234567890abcdefghijklmnop';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('encryptApiKey', () => {
    it('should encrypt an API key', () => {
      const encrypted = encryptApiKey(testApiKey, testSecret);
      
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(testApiKey);
      expect(encrypted.length).toBeGreaterThan(50); // Base64 encoded result should be longer
    });

    it('should produce different encrypted values for the same input (due to random IV)', () => {
      const encrypted1 = encryptApiKey(testApiKey, testSecret);
      const encrypted2 = encryptApiKey(testApiKey, testSecret);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty API key', () => {
      const encrypted = encryptApiKey('', testSecret);
      expect(encrypted).toBeTruthy();
    });

    it('should handle secrets of any length due to key derivation', () => {
      // scryptSync derives a key from any length secret, so this won't throw
      const encrypted = encryptApiKey(testApiKey, 'short');
      expect(encrypted).toBeTruthy();
      
      // But decryption with wrong secret should fail
      expect(() => decryptApiKey(encrypted, 'different-short')).toThrow();
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt an encrypted API key', () => {
      const encrypted = encryptApiKey(testApiKey, testSecret);
      const decrypted = decryptApiKey(encrypted, testSecret);
      
      expect(decrypted).toBe(testApiKey);
    });

    it('should throw error with wrong secret', () => {
      const encrypted = encryptApiKey(testApiKey, testSecret);
      const wrongSecret = 'wrong-secret-key-that-is-at-least-32-characters';
      
      expect(() => decryptApiKey(encrypted, wrongSecret)).toThrow();
    });

    it('should throw error for corrupted encrypted data', () => {
      const encrypted = encryptApiKey(testApiKey, testSecret);
      const corrupted = encrypted.slice(0, -10) + 'corrupted';
      
      expect(() => decryptApiKey(corrupted, testSecret)).toThrow();
    });

    it('should throw error for invalid base64', () => {
      expect(() => decryptApiKey('not-base64!@#$', testSecret)).toThrow();
    });

    it('should handle encrypted empty string', () => {
      const encrypted = encryptApiKey('', testSecret);
      const decrypted = decryptApiKey(encrypted, testSecret);
      
      expect(decrypted).toBe('');
    });
  });

  describe('isEncryptedApiKey', () => {
    it('should return true for valid encrypted API key', () => {
      const encrypted = encryptApiKey(testApiKey, testSecret);
      expect(isEncryptedApiKey(encrypted)).toBe(true);
    });

    it('should return false for plain text API key', () => {
      expect(isEncryptedApiKey('sk-1234567890')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncryptedApiKey('')).toBe(false);
    });

    it('should return false for invalid base64', () => {
      expect(isEncryptedApiKey('not!base64@string')).toBe(false);
    });

    it('should return false for too short base64', () => {
      expect(isEncryptedApiKey('dGVzdA==')).toBe(false); // "test" in base64
    });
  });

  describe('getEncryptionSecret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return encryption secret from environment', () => {
      process.env['API_KEY_ENCRYPTION_SECRET'] = testSecret;
      expect(getEncryptionSecret()).toBe(testSecret);
    });

    it('should throw error if secret is not set', () => {
      delete process.env['API_KEY_ENCRYPTION_SECRET'];
      expect(() => getEncryptionSecret()).toThrow('API_KEY_ENCRYPTION_SECRET environment variable is not set');
    });

    it('should throw error if secret is too short', () => {
      process.env['API_KEY_ENCRYPTION_SECRET'] = 'short-secret';
      expect(() => getEncryptionSecret()).toThrow('API_KEY_ENCRYPTION_SECRET must be at least 32 characters long');
    });
  });

  describe('Round-trip encryption/decryption', () => {
    const testCases = [
      { name: 'OpenAI key', key: 'sk-proj-abcdef123456789' },
      { name: 'Anthropic key', key: 'sk-ant-api03-abcdef123456789' },
      { name: 'Long key', key: 'a'.repeat(1000) },
      { name: 'Special characters', key: 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?' },
      { name: 'Unicode', key: 'sk-test-🔐🔑🗝️' },
    ];

    testCases.forEach(({ name, key }) => {
      it(`should handle ${name}`, () => {
        const encrypted = encryptApiKey(key, testSecret);
        const decrypted = decryptApiKey(encrypted, testSecret);
        expect(decrypted).toBe(key);
      });
    });
  });
});