'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Message, Bot, BotTemplate } from '@/lib/types/chat';
import { ChatMessage } from '@/components/chat/message';
import { BotControls } from '@/components/chat/bot-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from '@/components/chat/model-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatState } from '@/lib/hooks/use-chat-state';
import { useBotConversation } from '@/lib/hooks/use-bot-conversation';
import { QUOTA_CONSTANTS, DEFAULT_SHARED_SETTINGS, BOT_TEMPLATES } from '@/lib/constants/chat';
import { BotBank } from '@/components/chat/bot-bank';
import { useBots } from '@/lib/hooks/use-bots';
import { BotBankModal } from '@/components/chat/bot-bank-modal';

interface InspectionResult {
  messageId: string;
  assessment: string;
}

export function ChatInterface() {
  const {
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
    setTyping,
    setLastSpeaker,
    setConversationEnded,
    setBots,
    setSharedSettings,
    setRemainingQuota,
  } = useChatState();

  const {
    inspectionResults,
    handleUserMessage,
    handleRestartFromMessage,
  } = useBotConversation({
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
  });

  const [inputValue, setInputValue] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [suggestionValue, setSuggestionValue] = useState('');
  const [currentInspection, setCurrentInspection] = useState<InspectionResult | null>(null);
  const [isProcessingUserMessage, setIsProcessingUserMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string>('');

  const {
    botBank,
    saveToBank,
    createFromTemplate,
    createNewBot,
    clearBank,
    deleteFromBank,
  } = useBots({
    initialBank: {
      templates: Object.values(BOT_TEMPLATES),
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const messageToSend = inputValue.trim();
    setInputValue(''); // Clear input immediately for better UX
    setIsProcessingUserMessage(true);
    
    try {
      await handleUserMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally restore the input value if sending failed
      setInputValue(messageToSend);
    } finally {
      setIsProcessingUserMessage(false);
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('chatState');
    resetChat();
  };

  // Add autocomplete handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only show autocomplete if @ is at the start of the message
    if (value === '@') {
      setShowAutocomplete(true);
      setSuggestionValue('facilitator ');
    } else if (value.startsWith('@')) {
      setShowAutocomplete(true);
      const matchText = '@facilitator ';
      if (matchText.startsWith(value.toLowerCase())) {
        setSuggestionValue(matchText.slice(value.length));
      } else {
        setSuggestionValue('');
      }
    } else {
      setShowAutocomplete(false);
      setSuggestionValue('');
    }
  };

  const handleAutocomplete = () => {
    if (showAutocomplete && suggestionValue) {
      setInputValue(inputValue + suggestionValue);
      setShowAutocomplete(false);
      setSuggestionValue('');
      inputRef.current?.focus();
    }
  };

  const handleBackup = () => {
    const state = {
      messages,
      bots,
      sharedSettings,
      remainingQuota,
      conversationEnded,
      botBank,
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debate-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content);
        
        // Validate required fields
        if (!state.bots || !state.sharedSettings) {
          throw new Error('Invalid backup file format');
        }

        // First restore the bot bank if present
        if (state.botBank?.templates) {
          clearBank();
          state.botBank.templates.forEach((template: BotTemplate) => {
            const bot: Bot = {
              id: 'temp',
              name: template.name,
              description: template.description,
              modelConfig: template.modelConfig,
              systemPrompt: template.systemPrompt,
              uid: template.uid,
            };
            saveToBank(bot);
          });
        }

        // Then restore the bots, ensuring their uids exist in the bank
        const restoredBots = state.bots.map((bot: Bot) => {
          if (!bot.uid) return bot;
          
          // Check if the bot's template exists in the bank
          const templateExists = state.botBank?.templates.some(
            (t: BotTemplate) => t.uid === bot.uid
          );
          
          // If template doesn't exist, remove the uid
          if (!templateExists) {
            const { uid, ...botWithoutUid } = bot;
            return botWithoutUid;
          }
          
          return bot;
        });

        // Reset the chat state with the backup data
        setMessages(state.messages || []);
        setBots(restoredBots);
        setSharedSettings({
          ...DEFAULT_SHARED_SETTINGS,
          ...state.sharedSettings,
        });
        setRemainingQuota(state.remainingQuota || QUOTA_CONSTANTS.INITIAL_QUOTA);
        setConversationEnded(state.conversationEnded || false);
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Failed to restore backup. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteFromBank(templateId);
  };

  const handleLoadBot = (template: BotTemplate) => {
    const newBot = createFromTemplate(template, selectedBotId);
    setBots(prev => prev.map(bot => 
      bot.id === selectedBotId ? newBot : bot
    ));
    setBankModalOpen(false);
  };

  const handleOpenBankModal = (bot: Bot) => {
    setSelectedBotId(bot.id);
    setBankModalOpen(true);
  };

  const handleUpdateBot = (bot: Bot, updates: Partial<Bot>) => {
    setBots(prev => prev.map(b => 
      b.id === bot.id ? { ...b, ...updates } : b
    ));
  };

  const handleSaveToBank = (bot: Bot) => {
    const updatedBot = saveToBank(bot);
    if (updatedBot !== bot) {
      setBots(prev => prev.map(b => 
        b.id === bot.id ? updatedBot : b
      ));
    }
  };

  const handleCreateNewBot = (bot: Bot) => {
    const newBot = createNewBot(bot.id);
    setBots(prev => prev.map(b => 
      b.id === bot.id ? newBot : b
    ));
  };

  useEffect(() => {
    // Scroll the messages container to bottom when messages change
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <main className="h-screen flex gap-4 p-4 overflow-hidden max-w-[1800px] mx-auto">
        <div className="w-2/3 flex flex-col h-full">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto rounded-lg border">
            <div className="space-y-4 p-4 px-6">
              {messages.map(message => (
                <ChatMessage 
                  key={message.id} 
                  message={message}
                  wasChecked={inspectionResults.some(r => r.messageId === message.id)}
                  onInspect={() => {
                    const result = inspectionResults.find(r => r.messageId === message.id);
                    if (result) {
                      setCurrentInspection(result);
                    }
                  }}
                  onRestart={() => handleRestartFromMessage(message.id)}
                  botNames={botNames}
                />
              ))}
              {isTyping && (
                <div className="text-sm text-slate-500">
                  {lastSpeaker === 'facilitator' 
                    ? conversationEnded
                      ? 'Facilitator is typing...'
                      : 'Facilitator is checking...'
                    : `${activeBot?.name} is typing...`}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2 relative">
            <div className="flex-1 relative">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    } else if ((e.key === 'Tab' || e.key === 'ArrowRight') && showAutocomplete) {
                      e.preventDefault();
                      handleAutocomplete();
                    }
                  }}
                  placeholder="Type your message... (Use @ to mention facilitator)"
                  className="w-full pr-4 text-transparent bg-clip-text"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center">
                  <div className="px-3">
                    {(() => {
                      const match = inputValue.match(/^@[a-zA-Z]*/);
                      if (match) {
                        const mentionPart = match[0];
                        return (
                          <>
                            <span className="text-emerald-600 font-bold">{mentionPart}</span>
                            <span className="text-slate-900">{inputValue.slice(mentionPart.length)}</span>
                          </>
                        );
                      }
                      return <span className="text-slate-900">{inputValue}</span>;
                    })()}
                  </div>
                </div>
                {showAutocomplete && (
                  <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
                    <div className="px-3 flex">
                      <span className="invisible whitespace-pre font-bold">{inputValue}</span>
                      <span className="text-emerald-600/40 font-bold">{suggestionValue}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessingUserMessage}
            >
              Send
            </Button>
          </div>
        </div>
        <div className="w-1/3 overflow-y-auto h-full">
          <div className="space-y-4 px-4">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Chat Settings</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBackup}
                    variant="ghost"
                    size="icon"
                    title="Download backup"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="ghost"
                      size="icon"
                      title="Restore from backup"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleRestore}
                      className="hidden"
                    />
                  </div>
                  <Button
                    onClick={clearLocalStorage}
                    variant="ghost"
                    size="icon"
                    title="Clear saved chat state"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <ModelSelector
                    onSelect={(model) => 
                      updateSharedSettings({
                        provider: model.provider,
                        modelId: model.id,
                      })
                    }
                    selectedModelId={sharedSettings.modelId}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Response Length (words)</label>
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    value={sharedSettings.maxResponseLength}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 10 && value <= 500) {
                        updateSharedSettings({ maxResponseLength: value });
                      }
                    }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Conversation Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div>Remaining Quota: {remainingQuota}</div>
                      <Button 
                        onClick={() => addToQuota(5)} 
                        variant="outline" 
                        size="sm"
                        className="px-2 py-1"
                      >
                        +5
                      </Button>
                      <Button 
                        onClick={() => addToQuota(-Math.min(5, remainingQuota))} 
                        variant="outline" 
                        size="sm"
                        className="px-2 py-1"
                        disabled={remainingQuota === 0}
                      >
                        -5
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => resetChat()}
                        variant="outline"
                        size="sm"
                      >
                        Reset Conversation
                      </Button>
                      <Button
                        onClick={() => setConversationEnded(!conversationEnded)}
                        variant="destructive"
                        size="sm"
                      >
                        {conversationEnded ? 'Resume Conversation' : 'Stop Conversation'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {bots.map(bot => (
              <BotControls
                key={bot.id}
                bot={bot}
                onUpdateBot={handleUpdateBot}
                onSaveToBank={handleSaveToBank}
                onOpenBankModal={handleOpenBankModal}
                onCreateNew={handleCreateNewBot}
                isActive={bot.isActive}
                templates={botBank.templates}
              />
            ))}
          </div>
        </div>
      </main>

      <BotBankModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        templates={botBank.templates}
        onDelete={deleteFromBank}
        onSelect={handleLoadBot}
        targetBotId={selectedBotId || ''}
      />

      <Dialog open={currentInspection !== null} onOpenChange={() => setCurrentInspection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Facilitator Assessment</DialogTitle>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap">
            {currentInspection?.assessment}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 