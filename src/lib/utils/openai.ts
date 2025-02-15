import { Message } from '@/lib/types/chat';
import { ModelInfo } from '@/lib/types/models';
import OpenAI from 'openai';

if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function listOpenAIModels(): Promise<ModelInfo[]> {
  try {
    const response = await openai.models.list();
    return response.data
      .filter(model => model.id.startsWith('gpt'))
      .map(model => ({
        id: model.id,
        name: model.id,
        provider: 'openai' as const,
        description: `OpenAI model: ${model.id}`,
      }));
  } catch (error) {
    console.error('Error listing OpenAI models:', error);
    return [];
  }
}

export async function generateOpenAIResponse(
  modelId: string,
  messages: Message[],
  temperature: number,
  signal?: AbortSignal
): Promise<{ content: string; tokens?: number }> {
  try {
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
      temperature,
      max_tokens: 1000,
      stream: false,
    }, { signal });

    return {
      content: completion.choices[0]?.message?.content || 'No response generated',
      tokens: completion.usage?.total_tokens,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }
    console.error('Error generating OpenAI response:', error);
    throw error;
  }
}

export function calculateTokenUsage(content: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(content.length / 4);
} 