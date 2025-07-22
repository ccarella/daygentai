import { z } from 'zod';
import { LLMRequest } from '../types';

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(100000), // 100k char limit per message
});

const llmRequestSchema = z.object({
  model: z.string().min(1).max(100),
  messages: z.array(messageSchema).min(1).max(100), // Max 100 messages
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(100000).optional(),
  stream: z.boolean().optional(),
});

export function validateLLMRequest(request: unknown): LLMRequest {
  return llmRequestSchema.parse(request) as LLMRequest;
}

/**
 * Sanitizes prompt content to prevent injection attacks
 */
export function sanitizePromptContent(content: string): string {
  // Remove potential injection patterns
  let sanitized = content;
  
  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');
  
  // Remove potential command injection patterns
  const dangerousPatterns = [
    /\{\{.*?\}\}/g, // Template injection
    /<script.*?>.*?<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
  ];
  
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Limit consecutive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ');
  
  return sanitized.trim();
}

/**
 * Validates and sanitizes the entire request
 */
export function validateAndSanitizeRequest(request: unknown): LLMRequest {
  const validated = validateLLMRequest(request);
  
  // Sanitize all message contents
  validated.messages = validated.messages.map(msg => ({
    ...msg,
    content: sanitizePromptContent(msg.content),
  }));
  
  return validated;
}