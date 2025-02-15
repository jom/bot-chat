import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Bot, ChatState, Message, BotBank } from '@/lib/types/chat';
import { DEFAULT_STATE, DEFAULT_SHARED_SETTINGS, DEFAULT_BOTS, QUOTA_CONSTANTS } from '@/lib/constants/chat';

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [bots, setBots] = useState<Bot[]>(DEFAULT_BOTS);
  const [sharedSettings, setSharedSettings] = useState<ChatState['sharedSettings']>(DEFAULT_SHARED_SETTINGS);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSpeaker, setLastSpeaker] = useState<string | undefined>(undefined);
  const [remainingQuota, setRemainingQuota] = useState<number>(QUOTA_CONSTANTS.INITIAL_QUOTA);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log(JSON.stringify(bots, null, 2));
  // Load saved state and initialize random bot selection
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('chatState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Only load chat-specific state, bot bank is handled separately
        setMessages(parsed.messages || []);
        setBots(parsed.bots || DEFAULT_BOTS);
        setSharedSettings({
          ...DEFAULT_SHARED_SETTINGS,
          ...(parsed.sharedSettings || {}),
        });
        setRemainingQuota(parsed.remainingQuota || QUOTA_CONSTANTS.INITIAL_QUOTA);
        setConversationEnded(parsed.conversationEnded || false);
      } else {
        const randomIndex = Math.floor(Math.random() * DEFAULT_BOTS.length);
        setBots(prev => prev.map((bot: Bot, index: number) => ({
          ...bot,
          isActive: index === randomIndex,
        })));
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
      // Reset to default state if there's an error
      const randomIndex = Math.floor(Math.random() * DEFAULT_BOTS.length);
      setBots(DEFAULT_BOTS.map((bot: Bot, index: number) => ({
        ...bot,
        isActive: index === randomIndex,
      })));
      setRemainingQuota(QUOTA_CONSTANTS.INITIAL_QUOTA);
      setConversationEnded(false);
    }
    setIsInitialized(true);
  }, []);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    if (!isInitialized) return;

    try {
      // Only save chat-specific state, bot bank is handled separately
      const state = {
        messages,
        bots,
        sharedSettings,
        remainingQuota,
        conversationEnded,
      };
      localStorage.setItem('chatState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [isInitialized, messages, bots, sharedSettings, remainingQuota, conversationEnded]);

  const updateBot = (botId: string, updates: Partial<Bot>) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        const updatedBot = { ...bot, ...updates };
        return updatedBot;
      }
      return bot;
    }));
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateSharedSettings = (updates: Partial<ChatState['sharedSettings']>) => {
    setSharedSettings(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const resetChat = (messages: Message[] = []) => {
    setMessages(messages);
    setBots(prev => prev.map(bot => ({
      ...bot,
      isActive: false,
    })));
    setRemainingQuota(QUOTA_CONSTANTS.INITIAL_QUOTA);
    setConversationEnded(false);
    setIsTyping(false);
    setLastSpeaker(undefined);

    // Randomly select initial bot after reset
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * DEFAULT_BOTS.length);
      setBots(prev => prev.map((bot: Bot, index: number) => ({
        ...bot,
        isActive: index === randomIndex,
      })));
    }, 0);
  };

  const addToQuota = (amount: number) => {
    setRemainingQuota(prev => {
      const newQuota = Math.max(
        QUOTA_CONSTANTS.MIN_QUOTA,
        Math.min(QUOTA_CONSTANTS.MAX_QUOTA, prev + amount)
      );

      return newQuota;
    });
  };


  // Compute derived state
  const activeBot = bots.find(bot => bot.isActive);
  const botNames = Object.fromEntries(bots.map(bot => [bot.id, bot.name]));

  return {
    // State values
    messages,
    bots,
    sharedSettings,
    isTyping,
    lastSpeaker,
    remainingQuota,
    conversationEnded,
    isInitialized,
    activeBot,
    botNames,

    // State setters
    updateBot,
    addMessage,
    updateSharedSettings,
    resetChat,
    setMessages,
    addToQuota,
    setTyping: setIsTyping,
    setLastSpeaker,
    setConversationEnded,
    setBots,
    setSharedSettings,
    setRemainingQuota,
  };
} 