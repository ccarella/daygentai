import { LLMRequest, LLMResponse } from '../types';

// Anthropic adapter placeholder - to be implemented when Anthropic support is added
export class AnthropicAdapter {
  // @ts-expect-error - API key will be used when Anthropic support is implemented
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async complete(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error('Anthropic provider is not yet implemented');
  }
  
  async *stream(_request: LLMRequest): AsyncGenerator<string> {
    throw new Error('Anthropic provider is not yet implemented');
  }
}