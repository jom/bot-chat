'use client';

import { Bot, BotTemplate } from '@/lib/types/chat';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { TemperatureSelector } from './temperature-selector';
import { Button } from '@/components/ui/button';
import { Save, FolderOpen, Plus } from 'lucide-react';

interface BotControlsProps {
  bot: Bot;
  onUpdateBot: (bot: Bot, updates: Partial<Bot>) => void;
  onSaveToBank: (bot: Bot) => void;
  onOpenBankModal: (bot: Bot) => void;
  onCreateNew: (bot: Bot) => void;
  isActive?: boolean;
  templates: BotTemplate[];
}

export function BotControls({ 
  bot, 
  onUpdateBot, 
  onSaveToBank, 
  onOpenBankModal,
  onCreateNew,
  isActive,
  templates,
}: BotControlsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(bot.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(bot.description || '');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  // Update state when bot prop changes
  useEffect(() => {
    setEditedName(bot.name);
    setEditedDescription(bot.description || '');
  }, [bot.name, bot.description]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingName, isEditingDescription]);

  const handleNameSubmit = () => {
    if (editedName.trim()) {
      onUpdateBot(bot, { name: editedName.trim() });
    } else {
      setEditedName(bot.name); // Reset to original name if empty
    }
    setIsEditingName(false);
  };

  const handleDescriptionSubmit = () => {
    const trimmedDescription = editedDescription.trim();
    if (trimmedDescription) {
      onUpdateBot(bot, { description: trimmedDescription });
    } else {
      setEditedDescription(bot.description || ''); // Reset to original description if empty
    }
    setIsEditingDescription(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(bot.name);
      setIsEditingName(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDescriptionSubmit();
    } else if (e.key === 'Escape') {
      setEditedDescription(bot.description || '');
      setIsEditingDescription(false);
    }
  };

  // Check if the current bot matches any template in the bank
  const hasChanges = !templates.some(template => 
    template.uid === bot.uid &&
    template.name === bot.name &&
    template.description === bot.description &&
    template.systemPrompt === bot.systemPrompt &&
    template.modelConfig.temperature === bot.modelConfig.temperature
  );

  return (
    <div className={cn("space-y-4 rounded-lg border p-4", isActive && "border-blue-500")}>
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
              />
            ) : (
              <h3 
                className="text-lg font-semibold cursor-pointer hover:text-blue-500"
                onClick={() => setIsEditingName(true)}
                title="Click to edit bot name"
              >
                {bot.name}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onSaveToBank(bot)}
              variant="ghost"
              size="sm"
              className={cn(
                hasChanges 
                  ? "text-green-600 hover:text-green-700" 
                  : "text-gray-400 hover:text-gray-500 cursor-not-allowed"
              )}
              title={hasChanges ? "Save bot to bank" : "No changes to save"}
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onOpenBankModal(bot)}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              title="Load bot from bank"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onCreateNew(bot)}
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-700"
              title="Create new bot"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {isActive && <span className="text-sm text-blue-500">Active</span>}
          </div>
        </div>
        {isEditingDescription ? (
          <input
            ref={descriptionInputRef}
            type="text"
            className="text-sm text-gray-500 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleDescriptionSubmit}
            onKeyDown={handleDescriptionKeyDown}
          />
        ) : (
          <p 
            className="text-sm text-gray-500 cursor-pointer hover:text-blue-500"
            onClick={() => setIsEditingDescription(true)}
            title="Click to edit bot description"
          >
            {bot.description || 'Add a description...'}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">System Prompt</label>
        <textarea
          className="w-full rounded-md border p-2"
          value={bot.systemPrompt}
          onChange={(e) => onUpdateBot(bot, { systemPrompt: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <TemperatureSelector
          temperature={bot.modelConfig.temperature}
          setTemperature={(value) => onUpdateBot(bot, { modelConfig: { temperature: value } })}
        />
      </div>
    </div>
  );
} 