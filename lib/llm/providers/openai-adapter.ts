import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../types';

export class OpenAIAdapter {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const params: Parameters<typeof this.client.chat.completions.create>[0] = {
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens ?? null,
        stream: false, // We handle streaming separately
      };
      
      if (request.temperature !== undefined) {
        params.temperature = request.temperature;
      }
      
      const completion = await this.client.chat.completions.create(params);
      
      // Type assertion since we know this is not a stream
      const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
      
      const response: LLMResponse = {
        id: chatCompletion.id,
        choices: chatCompletion.choices.map((choice) => ({
          message: {
            role: choice.message.role,
            content: choice.message.content || '',
          },
          finish_reason: choice.finish_reason || 'stop',
        })),
        model: chatCompletion.model,
        created: chatCompletion.created,
      };
      
      if (chatCompletion.usage) {
        response.usage = {
          prompt_tokens: chatCompletion.usage.prompt_tokens,
          completion_tokens: chatCompletion.usage.completion_tokens,
          total_tokens: chatCompletion.usage.total_tokens,
        };
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
  
  async *stream(request: LLMRequest): AsyncGenerator<string> {
    const params: Parameters<typeof this.client.chat.completions.create>[0] = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? null,
      stream: true,
    };
    
    if (request.temperature !== undefined) {
      params.temperature = request.temperature;
    }
    
    const stream = await this.client.chat.completions.create(params);
    
    // Type assertion through unknown since we know this is a stream
    const chatStream = stream as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    
    for await (const chunk of chatStream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}