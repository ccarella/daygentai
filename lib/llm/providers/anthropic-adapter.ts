import { LLMRequest, LLMResponse } from '../types';

// Anthropic adapter placeholder - to be implemented when Anthropic support is added
export class AnthropicAdapter {
  constructor(private _apiKey: string) {
    // API key will be used when Anthropic support is implemented
  }
  
  async complete(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error('Anthropic provider is not yet implemented');
  }
  
  async *stream(_request: LLMRequest): AsyncGenerator<string> {
    throw new Error('Anthropic provider is not yet implemented');
  }
}