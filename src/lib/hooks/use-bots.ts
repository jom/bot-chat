import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Bot, BotTemplate, BotBank } from '@/lib/types/chat';

interface UseBotsProps {
  initialBank?: BotBank;
  onBankChange?: (bank: BotBank) => void;
}

export function useBots({ initialBank, onBankChange }: UseBotsProps = {}) {
  const [botBank, setBotBank] = useState<BotBank>(() => {
    // Try to load from localStorage first
    try {
      const savedBank = localStorage.getItem('botBank');
      if (savedBank) {
        return JSON.parse(savedBank);
      }
    } catch (error) {
      console.error('Error loading bot bank:', error);
    }
    // Fall back to initialBank or empty bank
    return initialBank || { templates: [] };
  });

  // Save to localStorage whenever the bank changes
  useEffect(() => {
    try {
      localStorage.setItem('botBank', JSON.stringify(botBank));
      onBankChange?.(botBank);
    } catch (error) {
      console.error('Error saving bot bank:', error);
    }
  }, [botBank, onBankChange]);

  // Save bot to bank and return updated bot if needed
  const saveToBank = (bot: Bot): Bot => {
    // If bot has a uid, verify it exists in the bank
    if (bot.uid) {
      const existingTemplate = botBank.templates.find(t => t.uid === bot.uid);
      if (!existingTemplate) {
        // If uid doesn't exist in bank, treat as new template
        const template: BotTemplate = {
          uid: bot.uid || nanoid(),
          name: bot.name,
          description: bot.description,
          modelConfig: {
            temperature: bot.modelConfig.temperature,
          },
          systemPrompt: bot.systemPrompt,
        };

        setBotBank(prev => ({
          ...prev,
          templates: [...prev.templates, template],
        }));

        return { ...bot, uid: template.uid };
      }

      // Update existing template
      const template: BotTemplate = {
        uid: bot.uid,
        name: bot.name,
        description: bot.description,
        modelConfig: {
          temperature: bot.modelConfig.temperature,
        },
        systemPrompt: bot.systemPrompt,
      };

      setBotBank(prev => ({
        ...prev,
        templates: prev.templates.map((t) => 
          t.uid === template.uid ? template : t
        ),
      }));

      return bot;
    }

    // Create new template
    const template: BotTemplate = {
      uid: nanoid(),
      name: bot.name,
      description: bot.description,
      modelConfig: {
        temperature: bot.modelConfig.temperature,
      },
      systemPrompt: bot.systemPrompt,
    };

    setBotBank(prev => ({
      ...prev,
      templates: [...prev.templates, template],
    }));

    return { ...bot, uid: template.uid };
  };

  // Create a new bot from a template
  const createFromTemplate = (template: BotTemplate, targetBotId: string): Bot => ({
    id: targetBotId,
    uid: template.uid,
    name: template.name,
    description: template.description,
    modelConfig: {
      temperature: template.modelConfig.temperature,
    },
    systemPrompt: template.systemPrompt,
    isActive: false,
  });

  // Create a completely new bot
  const createNewBot = (targetBotId: string): Bot => {
    const template: BotTemplate = {
      uid: nanoid(),
      name: 'New Bot',
      description: '',
      modelConfig: {
        temperature: 0.7,
      },
      systemPrompt: '',
    };

    // Save the template to the bank
    setBotBank(prev => ({
      ...prev,
      templates: [...prev.templates, template],
    }));

    // Create and return the bot
    return {
      id: targetBotId,
      uid: template.uid,
      name: template.name,
      description: template.description,
      modelConfig: template.modelConfig,
      systemPrompt: template.systemPrompt,
      isActive: false,
    };
  };

  // Delete a bot from the bank
  const deleteFromBank = (templateId: string) => {
    setBotBank(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.uid !== templateId),
    }));
  };

  // Get a bot template from the bank
  const getFromBank = (templateId: string) => {
    return botBank.templates.find(t => t.uid === templateId);
  };

  // Clear the entire bank
  const clearBank = () => {
    setBotBank({ templates: [] });
  };

  return {
    botBank,
    saveToBank,
    createFromTemplate,
    createNewBot,
    deleteFromBank,
    getFromBank,
    clearBank,
  };
} 