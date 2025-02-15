import { Message } from '@/lib/types/chat';
import { ModelInfo } from '@/lib/types/models';

const OLLAMA_API_BASE = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

export async function listOllamaModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${OLLAMA_API_BASE}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch Ollama models');
    }
    const data = await response.json();
    return data.models.map((model: any) => ({
      id: model.name,
      name: model.name,
      provider: 'ollama' as const,
      description: `Local Ollama model: ${model.name}`,
    }));
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

export async function generateOllamaResponse(
  modelId: string,
  messages: Message[],
  temperature: number,
  signal?: AbortSignal
): Promise<{ content: string; tokens?: number }> {
  try {
    // We need to trick ollama into thinking bots are users.
    const preparedMessages = messages.map(msg => ({
      name: msg.name ?? undefined,
      content: msg.content,
      role: msg.role,
    }));
    
    const response = await fetch('/api/ollama/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: preparedMessages,
        temperature,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error('Failed to generate Ollama response');
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || 'No response generated',
      tokens: data.usage?.total_tokens,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }
    console.error('Error generating Ollama response:', error);
    throw error;
  }
} 