import { Message } from '../types/chat';
import { ModelConfig, ModelInfo, ModelProvider } from '../types/models';
import { generateOllamaResponse, listOllamaModels } from '../utils/ollama';
import { generateOpenAIResponse, listOpenAIModels } from '../utils/openai';

export async function listAvailableModels(provider?: ModelProvider): Promise<ModelInfo[]> {
  if (provider === 'openai') {
    return listOpenAIModels();
  }
  if (provider === 'ollama') {
    return listOllamaModels();
  }
  
  // If no provider specified, return all models
  const [openaiModels, ollamaModels] = await Promise.all([
    listOpenAIModels(),
    listOllamaModels().catch(() => [] as ModelInfo[]), // Gracefully handle Ollama not being available
  ]);
  
  return [...openaiModels, ...ollamaModels];
}

interface ModelResponse {
  content: string;
  tokens?: number;
}

export async function generateModelResponse(
  config: ModelConfig,
  messages: Message[],
  signal?: AbortSignal
): Promise<{ content: string; tokens?: number }> {
  const temperature = config.temperature ?? 0.7;
  
  if (config.provider === 'ollama') {
    return generateOllamaResponse(config.modelId, messages, temperature, signal);
  } else {
    return generateOpenAIResponse(config.modelId, messages, temperature, signal);
  }
} 