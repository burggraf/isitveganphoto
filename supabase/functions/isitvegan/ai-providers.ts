import { AnthropicProvider } from './anthropic-provider.ts';
import { OpenAIProvider } from './openai-provider.ts';

export interface AIProvider {
  analyzeImage(image: string): Promise<any>;
}

export function getAIProvider(provider: 'anthropic' | 'openai'): AIProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

