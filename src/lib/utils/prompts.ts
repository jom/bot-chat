import { Message, Bot } from '@/lib/types/chat';

export const getPromptForQuota = (quota: number): string => {
  if (quota > 3) {
    return `Your role in this discussion is to:
1. Share thoughtful perspectives and insights
2. Engage meaningfully with the other bot's ideas
3. Build upon or respectfully challenge previous points
4. Keep responses focused and concise

Only ask questions or expand on a topic if they would genuinely:
- Help explore an interesting new angle
- Clarify an important point
- Bridge different viewpoints
- Lead to deeper insights

If it is a straightforward question, answer it directly and plainly. If there's nothing meaningful to ask, do not ask any questions (especially if the answer is straightforward).`;
  } else {
    return `This is one of the final responses in this discussion. Your role is to:
1. DO NOT ask any new questions
2. Briefly summarize your final position
3. Acknowledge points of agreement with the other bot
4. End with a concluding statement that wraps up your perspective

Keep your response focused, concise, and conclusive.`;
  }
};

// Helper function to prepare messages for LLM
export const prepareMessagesForLLM = (messages: Message[], whoAmI?: string): Message[] => {
  let preparedMessages = messages.map((msg): Message => ({
    ...msg,
    name: msg.role === 'assistant' && msg.botId ? msg.botId : undefined
  }));


  // We only want to provide the messages since the last human message that didn't mention `@facilitator`.
  const lastHumanMessageIndex = preparedMessages.findLastIndex(msg => msg.role === 'user' && !msg.content.includes('@facilitator'));

  if (lastHumanMessageIndex !== -1) {
    // We want to capture the system messages that came before the last human message.
    const systemMessages = preparedMessages.slice(0, lastHumanMessageIndex).filter(msg => msg.role === 'system');
    preparedMessages = [...systemMessages, ...preparedMessages.slice(lastHumanMessageIndex)];
  }

  if (whoAmI === 'bot1') {
    // If I'm bot1, I want to make it so all of bot2's messages are marked as a user message.
    preparedMessages = preparedMessages.map(msg => {
      if (msg.role === 'assistant' && msg.botId === 'bot2') {
        return { ...msg, role: 'user' };
      }
      return msg;
    });
  } else if (whoAmI === 'bot2') {
    // If I'm bot2, I want to make it so all of bot1's messages are marked as a user message.
    preparedMessages = preparedMessages.map(msg => {
      if (msg.role === 'assistant' && msg.botId === 'bot1') {
        return { ...msg, role: 'user' };
      }
      return msg;
    });
  } else if (whoAmI === 'facilitator') {
    // If I'm the facilitator, I want to make it so all of the bot messages are marked as a user message.
    preparedMessages = preparedMessages.map(msg => {
      if (msg.role === 'assistant' && ['bot1', 'bot2'].includes(msg.botId ?? '')) {
        return { ...msg, role: 'user' };
      }
      return msg;
    });
  }

  return preparedMessages;
};

// Helper function to get relevant history
export const getRelevantHistory = (messages: Message[], limit: number = 10): Message[] => {
  return messages.slice(-limit);
}; 