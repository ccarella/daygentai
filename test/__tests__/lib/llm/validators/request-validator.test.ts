import { describe, it, expect } from 'vitest';
import {
  validateLLMRequest,
  sanitizePromptContent,
  validateAndSanitizeRequest
} from '@/lib/llm/validators/request-validator';

describe('Request Validator', () => {
  describe('validateLLMRequest', () => {
    it('should validate a valid request', () => {
      const validRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant' },
          { role: 'user' as const, content: 'Hello' }
        ],
        temperature: 0.7,
        max_tokens: 100
      };

      expect(() => validateLLMRequest(validRequest)).not.toThrow();
    });

    it('should validate request with minimal fields', () => {
      const minimalRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }]
      };

      const result = validateLLMRequest(minimalRequest);
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.messages).toHaveLength(1);
    });

    it('should throw for missing model', () => {
      const invalidRequest = {
        messages: [{ role: 'user' as const, content: 'Hello' }]
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for empty messages array', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: []
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for invalid role', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'invalid' as any, content: 'Hello' }]
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for empty message content', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: '' }]
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for message content exceeding limit', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'a'.repeat(100001) }]
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for too many messages', () => {
      const messages = Array(101).fill({ role: 'user' as const, content: 'Hello' });
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for invalid temperature', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 3 // > 2
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });

    it('should throw for negative max_tokens', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
        max_tokens: -1
      };

      expect(() => validateLLMRequest(invalidRequest)).toThrow();
    });
  });

  describe('sanitizePromptContent', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      expect(sanitizePromptContent(input)).toBe('HelloWorld');
    });

    it('should remove template injection patterns', () => {
      const input = 'Hello {{evil}} World {{malicious}}';
      expect(sanitizePromptContent(input)).toBe('Hello  World');
    });

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      expect(sanitizePromptContent(input)).toBe('Hello  World');
    });

    it('should remove javascript: protocol', () => {
      const input = 'Click here: javascript:alert("XSS")';
      expect(sanitizePromptContent(input)).toBe('Click here: alert("XSS")');
    });

    it('should remove event handlers', () => {
      const input = 'Hello <div onclick="alert()">World</div>';
      // The regex removes 'onclick=' entirely
      expect(sanitizePromptContent(input)).toBe('Hello <div "alert()">World</div>');
    });

    it('should limit consecutive whitespace', () => {
      const input = 'Hello     World\n\n\n\nTest';
      // The regex replaces 3+ whitespace chars (including newlines) with 2 spaces
      expect(sanitizePromptContent(input)).toBe('Hello  World  Test');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizePromptContent(input)).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(sanitizePromptContent('')).toBe('');
    });

    it('should handle complex injection attempts', () => {
      const input = `
        {{__proto__.polluted = true}}
        <script>fetch('/api/keys')</script>
        <img onerror="alert()" src="x">
        javascript:void(0)
        Hello World
      `;
      const result = sanitizePromptContent(input);
      
      expect(result).not.toContain('{{');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Hello World');
    });
  });

  describe('validateAndSanitizeRequest', () => {
    it('should validate and sanitize a request', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system' as const, content: 'You are {{role}}' },
          { role: 'user' as const, content: 'Hello <script>alert()</script>' }
        ],
        temperature: 0.7
      };

      const result = validateAndSanitizeRequest(request);
      
      expect(result.messages[0]!.content).toBe('You are');
      expect(result.messages[1]!.content).toBe('Hello');
    });

    it('should preserve valid content while removing malicious patterns', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'user' as const, 
            content: 'Analyze this code: function() { return "{{value}}"; }'
          }
        ]
      };

      const result = validateAndSanitizeRequest(request);
      
      expect(result.messages[0]!.content).toBe('Analyze this code: function() { return ""; }');
    });

    it('should handle all message types', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system' as const, content: 'System {{injection}}' },
          { role: 'assistant' as const, content: 'Assistant <script>' },
          { role: 'user' as const, content: 'User onclick=' }
        ]
      };

      const result = validateAndSanitizeRequest(request);
      
      expect(result.messages[0]!.content).toBe('System');
      expect(result.messages[1]!.content).toBe('Assistant <script>'); // Script tag without closing tag is not removed
      expect(result.messages[2]!.content).toBe('User');
    });

    it('should throw for invalid request structure', () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: 'not an array' as any
      };

      expect(() => validateAndSanitizeRequest(invalidRequest)).toThrow();
    });
  });
});