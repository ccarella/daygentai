export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  created: number;
}

export interface ProxyRequest {
  provider: 'openai' | 'anthropic';
  workspaceId: string;
  request: LLMRequest;
  endpoint: string;
}

export interface ProxyResponse {
  data: LLMResponse;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  cached: boolean;
  requestId: string;
}

export interface RateLimitConfig {
  minuteLimit: number;
  hourLimit: number;
  dayLimit: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  minuteLimit: 20,
  hourLimit: 100,
  dayLimit: 1000,
};

export const MODEL_COSTS = {
  // OpenAI pricing per 1M tokens
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Anthropic pricing per 1M tokens
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 1.00, output: 5.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
} as const;

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
  if (!costs) {
    // Default to GPT-4o mini pricing if model not found
    return (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
  }
  
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}