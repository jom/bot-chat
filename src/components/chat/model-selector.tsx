'use client';

import { useEffect, useState } from 'react';
import { ModelInfo, ModelProvider } from '@/lib/types/models';
import { listAvailableModels } from '@/lib/services/model-service';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ModelSelectorProps {
  onSelect: (model: ModelInfo) => void;
  selectedModelId?: string;
}

export function ModelSelector({ onSelect, selectedModelId }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>('openai');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const availableModels = await listAvailableModels();
      setModels(availableModels);
    };
    loadModels();
  }, []);

  const filteredModels = models.filter(model => model.provider === selectedProvider);
  const selectedModel = models.find(model => model.id === selectedModelId);

  const handleModelChange = (value: string) => {
    const selectedModel = models.find(model => model.id === value);
    if (selectedModel) {
      onSelect(selectedModel);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {selectedModel ? (
            <span>
              {selectedModel.name} ({selectedProvider})
            </span>
          ) : (
            'Select a model'
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choose a Model</DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue="openai"
          value={selectedProvider}
          onValueChange={value => setSelectedProvider(value as ModelProvider)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="ollama">Ollama</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedProvider} className="mt-4 space-y-2">
            <Select value={selectedModel?.id} onValueChange={handleModelChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className="max-h-[300px] overflow-y-auto">
                  {filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {filteredModels.length === 0 && (
              <div className="text-center text-sm text-slate-500">
                {selectedProvider === 'ollama'
                  ? 'No local models found. Make sure Ollama is running.'
                  : 'No models available.'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 