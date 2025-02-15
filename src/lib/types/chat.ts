import { ModelConfig, BotModelConfig, ModelProvider } from './models';

export interface BotTemplate {
  uid: string;  // Unique identifier for the template in the bank
  name: string;
  description?: string;
  modelConfig: {
    temperature: number;
  };
  systemPrompt: string;
}

export interface BotBank {
  templates: BotTemplate[];
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  botId?: string;
  timestamp: number;
  metadata?: {
    tokens?: number;
    responseTime?: number;
    temperature?: number;
    facilitatorDecision?: 'continue' | 'end';
  };
}

export interface Bot {
  id: string;  // bot1 or bot2
  uid?: string;  // The template uid this bot was created from, if any
  name: string;
  description?: string;
  modelConfig: BotModelConfig;
  systemPrompt: string;
  isActive?: boolean;  // To track which bot's turn it is
}

export interface ChatState {
  messages: Message[];
  bots: Bot[];
  isTyping: boolean;
  remainingQuota: number;
  conversationEnded: boolean;
  lastSpeaker?: string;  // To track which bot spoke last
  sharedSettings: {
    provider: 'openai' | 'ollama';
    modelId: string;
    maxResponseLength: number;
  };
  botBank?: BotBank;  // Add bot bank to chat state
}

export interface BotConfig {
  modelConfig: ModelConfig;
  systemPrompt: string;
  quota: number;
}

export interface SharedSettings {
  provider: ModelProvider;
  modelId: string;
  maxResponseLength: number;
} 