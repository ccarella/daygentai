import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a key from the encryption secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypts an API key using AES-256-GCM
 */
export function encryptApiKey(apiKey: string, encryptionSecret: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(encryptionSecret, salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Combine salt, iv, tag, and encrypted data
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypts an API key using AES-256-GCM
 */
export function decryptApiKey(encryptedApiKey: string, encryptionSecret: string): string {
  const combined = Buffer.from(encryptedApiKey, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(encryptionSecret, salt);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Gets the encryption secret from environment variables
 */
export function getEncryptionSecret(): string {
  const secret = process.env['API_KEY_ENCRYPTION_SECRET'];
  
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is not set');
  }
  
  if (secret.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be at least 32 characters long');
  }
  
  return secret;
}

/**
 * Validates if a string is a valid encrypted API key
 */
export function isEncryptedApiKey(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64');
    // Check if the length is at least the minimum required
    return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}