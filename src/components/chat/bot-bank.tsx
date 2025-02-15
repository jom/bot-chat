'use client';

import { BotTemplate } from '@/lib/types/chat';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotBankProps {
  templates: BotTemplate[];
  onDelete: (templateId: string) => void;
  onLoad: (template: BotTemplate) => void;
  onCreateNew: () => void;
}

export function BotBank({ templates, onDelete, onLoad, onCreateNew }: BotBankProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bot Bank</h3>
        <Button
          onClick={onCreateNew}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Bot
        </Button>
      </div>

      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No bots saved yet. Save a bot to add it to your bank.
          </p>
        ) : (
          templates.map(template => (
            <div
              key={template.id}
              className="flex items-start justify-between p-3 rounded-md border hover:border-blue-500 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h4 className="font-medium truncate">{template.name}</h4>
                  <span className="text-sm text-gray-500">
                    {template.modelConfig.temperature.toFixed(1)} temp
                  </span>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 truncate">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 truncate mt-1">
                  {template.systemPrompt}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => onLoad(template)}
                  variant="outline"
                  size="sm"
                >
                  Load
                </Button>
                <Button
                  onClick={() => onDelete(template.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 