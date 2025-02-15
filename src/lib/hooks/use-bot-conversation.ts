import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import { nanoid } from 'nanoid';
import { Bot, Message, ChatState } from '@/lib/types/chat';
import { ModelConfig } from '@/lib/types/models';
import { generateModelResponse } from '@/lib/services/model-service';
import { QUOTA_CONSTANTS, FACILITATOR_BOT } from '@/lib/constants/chat';
import { getPromptForQuota, prepareMessagesForLLM, getRelevantHistory } from '@/lib/utils/prompts';

interface UseBotConversationProps {
  messages: Message[];
  bots: Bot[];
  sharedSettings: ChatState['sharedSettings'];
  isTyping: boolean;
  lastSpeaker: string | undefined;
  remainingQuota: number;
  conversationEnded: boolean;
  addMessage: (message: Message) => void;
  setTyping: (isTyping: boolean) => void;
  setLastSpeaker: (speaker: string | undefined) => void;
  setConversationEnded: (ended: boolean) => void;
  addToQuota: (amount: number) => void;
  updateBot: (botId: string, updates: Partial<Bot>) => void;
  resetChat: (messages: Message[]) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useBotConversation({
  messages,
  bots,
  sharedSettings,
  isTyping,
  lastSpeaker,
  remainingQuota,
  conversationEnded,
  addMessage,
  setTyping,
  setLastSpeaker,
  setConversationEnded,
  addToQuota,
  updateBot,
  resetChat,
  setMessages,
}: UseBotConversationProps) {
  const [isBotsActive, setIsBotsActive] = useState(false);
  const [inspectionResults, setInspectionResults] = useState<Array<{
    messageId: string;
    assessment: string;
  }>>([]);
  
  // Add AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track the latest values in refs to avoid stale closures
  const stateRef = useRef({
    messages,
    bots,
    facilitatorBot: FACILITATOR_BOT,
    sharedSettings,
    isTyping,
    lastSpeaker,
    remainingQuota,
    conversationEnded,
  });

  // Update ref when props change
  useEffect(() => {
    stateRef.current = {
      messages,
      bots,
      facilitatorBot: FACILITATOR_BOT,
      sharedSettings,
      isTyping,
      lastSpeaker,
      remainingQuota,
      conversationEnded,
    };
  }, [messages, bots, sharedSettings, isTyping, lastSpeaker, remainingQuota, conversationEnded]);

  // Cancel pending requests when conversation ends
  useEffect(() => {
    if (conversationEnded && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [conversationEnded]);

  // Reset isBotsActive when conversation ends
  useEffect(() => {
    if (conversationEnded) {
      setIsBotsActive(false);
    }
  }, [conversationEnded]);

  const handleNextAction = async (messages: Message[], skipAssessment: boolean = false) => {
    // Check if conversation is ended (unless it's a user message restarting the conversation)
    const isUserMessage = messages[messages.length - 1]?.role === 'user';
    if (stateRef.current.conversationEnded && !isUserMessage) {
      console.log('Conversation is ended, stopping next action');
      return;
    }

    // Check if we're out of quota
    if (stateRef.current.remainingQuota <= 0) {
      console.log('Out of quota, ending conversation');
      setConversationEnded(true);
      setTyping(false);
      updateBot('bot1', { isActive: false });
      updateBot('bot2', { isActive: false });
      
      addMessage({
        id: nanoid(),
        role: 'system',
        content: 'The conversation has ended due to insufficient quota.',
        timestamp: Date.now(),
      });
      
      await handleFacilitatorAssessment(messages, true);
      return;
    }

    // Count messages from each bot (excluding facilitator)
    const botMessages = messages.filter(m => 
      m.role === 'assistant' && m.botId !== 'facilitator'
    );
    
    // If no messages, start with a random bot
    if (botMessages.length === 0) {
      const randomIndex = Math.floor(Math.random() * stateRef.current.bots.length);
      const firstBot = stateRef.current.bots[randomIndex];
      updateBot(firstBot.id, { isActive: true });
      await generateBotResponse(firstBot, messages);
      return;
    }

    // Check if we have a complete exchange and the last message wasn't from the facilitator
    const lastMessage = messages[messages.length - 1];
    const lastTwoMessages = botMessages.slice(-2);
    const isCompleteExchange = lastTwoMessages.length === 2 && 
      lastTwoMessages[0].botId !== lastTwoMessages[1].botId;

    if (isCompleteExchange && !skipAssessment && lastMessage?.botId !== 'facilitator') {
      // Both bots have spoken, time for facilitator assessment
      await handleFacilitatorAssessment(messages);
    } else if (!isCompleteExchange || skipAssessment) {
      // Get the other bot to respond
      const lastBotId = botMessages[botMessages.length - 1]?.botId;
      const nextBot = stateRef.current.bots.find(b => b.id !== lastBotId);
      if (nextBot) {
        updateBot(nextBot.id, { isActive: true });
        await generateBotResponse(nextBot, messages);
      }
    }
  };

  const handleRestartFromMessage = async (messageId: string) => {
    // Find the index of the message to restart from
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Keep messages up to and including the selected message
    const selectedMessages = messages.slice(0, messageIndex + 1);
    
    // Count human messages to add quota
    const humanMessages = selectedMessages.filter(m => m.role === 'user').length;
    const quotaToAdd = humanMessages * QUOTA_CONSTANTS.USER_MESSAGE_BONUS;
    
    addToQuota(quotaToAdd);
    resetChat(selectedMessages);

    // Continue the conversation
    await handleNextAction(selectedMessages, false);
  };

  const addQuotaBonus = (amount: number = QUOTA_CONSTANTS.USER_MESSAGE_BONUS) => {
    addToQuota(amount);
  };

  const endConversation = (message?: string) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setConversationEnded(true);
    setTyping(false);
    updateBot('bot1', { isActive: false });
    updateBot('bot2', { isActive: false });
    setIsBotsActive(false);
    
    if (message) {
      addMessage({
        id: nanoid(),
        role: 'system',
        content: message,
        timestamp: Date.now(),
      });
    }
  };

  const resumeConversation = () => {
    setConversationEnded(false);
  };

  const handleFacilitatorAssessment = async (messages: Message[], forceEnd: boolean = false) => {
    try {
      let facilitatorDecision: 'continue' | 'end' = forceEnd ? 'end' : 'continue';
      let assessment = '';

      // Count messages from each bot (excluding facilitator)
      const botMessages = messages.filter(m => 
        m.role === 'assistant' && m.botId !== 'facilitator'
      );

      // Guard against empty bot messages
      if (botMessages.length === 0) {
        console.warn('No bot messages found for assessment');
        setTyping(false);
        return;
      }

      if (!forceEnd) {
        // Create new AbortController for this request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setTyping(true);
        setLastSpeaker('facilitator');
        updateBot('bot1', { isActive: false });
        updateBot('bot2', { isActive: false });
        
        // Count complete exchanges
        const exchanges: { bot1: Message; bot2: Message }[] = [];
        let currentExchange: Partial<{ bot1: Message; bot2: Message }> = {};
        
        for (const msg of botMessages) {
          if (!msg.botId) continue; // Skip messages without botId
          
          if (msg.botId === 'bot1' && !currentExchange.bot1) {
            currentExchange.bot1 = msg;
          } else if (msg.botId === 'bot2' && !currentExchange.bot2) {
            currentExchange.bot2 = msg;
          }
          
          if (currentExchange.bot1 && currentExchange.bot2) {
            exchanges.push(currentExchange as { bot1: Message; bot2: Message });
            currentExchange = {};
          }
        }
        
        const completeExchangeCount = exchanges.length;
        
        const systemMessage: Message = {
          id: nanoid(),
          role: 'system',
          content: `${FACILITATOR_BOT.systemPrompt}\n\nCurrent complete exchanges: ${completeExchangeCount}`,
          timestamp: Date.now(),
        };

        const { content } = await generateModelResponse(
          {
            provider: stateRef.current.sharedSettings.provider,
            modelId: stateRef.current.sharedSettings.modelId,
            temperature: FACILITATOR_BOT.modelConfig.temperature,
          },
          prepareMessagesForLLM([systemMessage, ...messages], 'facilitator'),
          abortControllerRef.current.signal
        );

        assessment = `Exchange counts: {"completeExchanges": ${completeExchangeCount}}\n\n${content}`;
        facilitatorDecision = content.includes('END') ? 'end' : 'continue';
      }

      console.log('Facilitator decision:', facilitatorDecision);

      const lastBotMessage = botMessages[botMessages.length - 1];
      if (!lastBotMessage) {
        console.warn('No last bot message found');
        setTyping(false);
        return;
      }

      setInspectionResults(prev => [...prev, {
        messageId: lastBotMessage.id,
        assessment
      }]);

      // Update the last bot message with the facilitator decision
      const updatedMessage = {
        ...lastBotMessage,
        metadata: {
          ...lastBotMessage.metadata,
          facilitatorDecision
        }
      };
      
      // Find and update the message in the messages array while preserving all other messages
      const messageIndex = messages.findIndex(m => m.id === lastBotMessage.id);
      if (messageIndex !== -1) {
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = updatedMessage;
        setMessages((prev: Message[]) => [
          ...prev.slice(0, messageIndex),
          updatedMessage,
          ...prev.slice(messageIndex + 1)
        ]);
      }

      if (facilitatorDecision === 'end' || forceEnd) {
        // Create new AbortController for summary request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const startTime = Date.now();
        const summaryMessage = await generateModelResponse(
          {
            provider: stateRef.current.sharedSettings.provider,
            modelId: stateRef.current.sharedSettings.modelId,
            temperature: FACILITATOR_BOT.modelConfig.temperature,
          },
          [
          ...prepareMessagesForLLM(messages, 'facilitator'),
          {
            id: nanoid(),
            role: 'user',
            name: 'facilitator',
            content: 'Please provide a concise 2-3 sentence summary of the entire conversation, highlighting the key points discussed.',
            timestamp: Date.now(),
          }
        ],
          abortControllerRef.current.signal
        );

        // Only add summary if conversation hasn't been ended
        if (!stateRef.current.conversationEnded) {
          addMessage({
            id: nanoid(),
            role: 'system',
            content: `Final Summary:\n${summaryMessage.content}`,
            botId: 'facilitator',
            timestamp: Date.now(),
            metadata: {
              tokens: summaryMessage.tokens,
              responseTime: Date.now() - startTime,
              temperature: FACILITATOR_BOT.modelConfig.temperature,
            },
          });
        }
        endConversation();
      } else {
        const lastBotId = lastBotMessage.botId;
        if (!lastBotId) {
          console.warn('Last bot message has no botId');
          setTyping(false);
          return;
        }

        const nextBot = stateRef.current.bots.find(b => b.id !== lastBotId);
        
        setTyping(false);
        setLastSpeaker(undefined);
        
        if (nextBot) {
          updateBot(nextBot.id, { isActive: true });
          await handleNextAction([...messages], true);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Request was cancelled') {
        console.log('Facilitator assessment cancelled');
      } else {
        console.error('Facilitator assessment error:', error);
      }
      setTyping(false);
      const botMessages = messages.filter(m => 
        m.role === 'assistant' && m.botId !== 'facilitator'
      );
      const lastBotMessage = botMessages[botMessages.length - 1];
      if (lastBotMessage?.botId) {
        const nextBot = stateRef.current.bots.find(b => b.id !== lastBotMessage.botId);
        if (nextBot) {
          updateBot(nextBot.id, { isActive: true });
        }
      }
      setIsBotsActive(false);
    }
  };

  const generateBotResponse = async (bot: Bot, messages: Message[]) => {
    try {
      setIsBotsActive(true);
      addToQuota(-QUOTA_CONSTANTS.BOT_RESPONSE_COST);
      setTyping(true);
      setLastSpeaker(bot.id);

      // Create new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const lastMessage = messages[messages.length - 1];
      const isUserMessage = lastMessage.role === 'user';
      const isFacilitatorMessage = lastMessage.botId === 'facilitator';
      const isBotMessage = lastMessage.role === 'assistant' && lastMessage.botId === bot.id;
      const lastHumanMessage = messages.findLast(m => m.role === 'user');
      const startTime = Date.now();
      const maxLength = stateRef.current.sharedSettings.maxResponseLength;

      const systemMessage: Message = {
        id: nanoid(),
        role: 'system',
        content: `IMPORTANT INSTRUCTIONS:
1. Please try to limit your response to ${maxLength} words. Once you go over, wrap up your sentence.
2. Your response MUST be concise and focused.
3. You are ${bot.name} (${bot.id}) in this conversation.

IMPORTANT:Always stay focused on the original human message: ${lastHumanMessage?.content}

Participating Bot ID to Name Mapping:
${stateRef.current.bots.map(b => `- ID: ${b.id} Name: ${b.name}`).join('\n')}

You are also chatting with a user.

${bot.systemPrompt}

${getPromptForQuota(stateRef.current.remainingQuota)}

Respond to the ongoing conversation, addressing what the other bot has said (as necessary). Don't just repeat what the other bot has said. When referring to the other bot, use their name (${stateRef.current.bots.find(b => b.id !== bot.id)?.name}) when appropriate.

You are currently responding to ${isUserMessage ? 'the user' : isFacilitatorMessage ? 'the facilitator' : isBotMessage ? 'the other bot' : 'the conversation'}.

Remember: 
- Keep your response under ${maxLength} words
- You are ${bot.name}
- Address the other bot by their name when appropriate`,
        timestamp: Date.now(),
      };
      
      const history = getRelevantHistory(messages);
      
      const modelConfig = {
        provider: stateRef.current.sharedSettings.provider,
        modelId: stateRef.current.sharedSettings.modelId,
        temperature: bot.modelConfig.temperature,
      };

      const { content, tokens } = await generateModelResponse(
        modelConfig,
        prepareMessagesForLLM([systemMessage, ...history], bot.id ?? 'human'),
        abortControllerRef.current.signal
      );

      // Only add message if the conversation hasn't been ended
      if (!stateRef.current.conversationEnded) {
        const words = content.split(/\s+/);
        const truncatedContent = words.length > maxLength 
          ? words.slice(0, maxLength).join(' ') + '...'
          : content;

        const botMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: truncatedContent,
          botId: bot.id,
          name: bot.name,
          timestamp: Date.now(),
          metadata: {
            tokens,
            responseTime: Date.now() - startTime,
            temperature: bot.modelConfig.temperature,
          },
        };

        addMessage(botMessage);
        
        // Continue the conversation
        await handleNextAction([...messages, botMessage], false);
      }

      setTyping(false);
      updateBot(bot.id, { isActive: false });
    } catch (error) {
      if (error instanceof Error && error.message === 'Request was cancelled') {
        console.log('Bot response cancelled');
      } else {
        console.error('Error generating bot response:', error);
      }
      setTyping(false);
      updateBot(bot.id, { isActive: false });
      setIsBotsActive(false);
    }
  };

  const handleUserMessage = async (content: string) => {
    const isFacilitatorMessage = content.trim().toLowerCase().startsWith('@facilitator');

    // Add quota for user message
    addQuotaBonus();
    resumeConversation();
    setTyping(true);

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMessage);

    if (isFacilitatorMessage) {
      setTyping(true);
      setLastSpeaker('facilitator');

      const startTime = Date.now();
      const { content: responseContent, tokens } = await generateModelResponse(
        {
          provider: stateRef.current.sharedSettings.provider,
          modelId: stateRef.current.sharedSettings.modelId,
          temperature: FACILITATOR_BOT.modelConfig.temperature,
        },
        prepareMessagesForLLM([
          {
            id: nanoid(),
            role: 'system',
            content: `The user has directly asked you a question. Respond helpfully while maintaining your role as a conversation facilitator.
            
            Keep in mind the bot ID to name mapping in your response:
            ${stateRef.current.bots.map(b => `- ID: ${b.id} Name: ${b.name}`).join('\n')}
            `,
            timestamp: Date.now(),
          },
          ...stateRef.current.messages,
          userMessage
        ], 'facilitator')
      );

      addMessage({
        id: nanoid(),
        role: 'assistant',
        content: responseContent,
        botId: 'facilitator',
        timestamp: Date.now(),
        metadata: {
          tokens,
          responseTime: Date.now() - startTime,
          temperature: FACILITATOR_BOT.modelConfig.temperature,
        },
      });

      setTyping(false);
    } else {
      await handleNextAction([...stateRef.current.messages, userMessage], false);
    }
  };

  return {
    isBotsActive,
    inspectionResults,
    handleUserMessage,
    handleRestartFromMessage,
    handleNextAction,
  };
} 