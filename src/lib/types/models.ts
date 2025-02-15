export type ModelProvider = 'openai' | 'ollama';

export interface BaseModelConfig {
  provider: ModelProvider;
  modelId: string;
  temperature: number;
}

export interface OpenAIModelConfig extends BaseModelConfig {
  provider: 'openai';
}

export interface OllamaModelConfig extends BaseModelConfig {
  provider: 'ollama';
}

export interface ModelConfig {
  provider: 'openai' | 'ollama';
  modelId: string;
  temperature?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  description?: string;
}

export interface BotModelConfig {
  temperature: number;
} 