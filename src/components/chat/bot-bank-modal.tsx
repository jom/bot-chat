'use client';

import { BotTemplate } from '@/lib/types/chat';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Check } from 'lucide-react';

interface BotBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: BotTemplate[];
  onDelete: (templateId: string) => void;
  onSelect: (template: BotTemplate) => void;
  targetBotId: string;
}

export function BotBankModal({ 
  isOpen, 
  onClose, 
  templates, 
  onDelete, 
  onSelect,
  targetBotId,
}: BotBankModalProps) {
  const handleSelect = (template: BotTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bot Bank</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No bots saved yet. Save a bot to add it to your bank.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.uid}
                  className="flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Temperature: {template.modelConfig.temperature}
                      </p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm">
                        {template.systemPrompt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(template)}
                        title="Load this bot"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(template.uid)}
                        title="Delete this bot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 