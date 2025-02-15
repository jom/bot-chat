'use client';

import { Message } from '@/lib/types/chat';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Clock, Cpu, Thermometer, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  onInspect?: () => void;
  wasChecked?: boolean;
  onRestart?: () => void;
  botNames?: Record<string, string>;
}

export function ChatMessage({ message, onInspect, wasChecked, onRestart, botNames }: ChatMessageProps) {
  const isBot = message.role === 'assistant';
  const isFacilitator = message.botId === 'facilitator';
  const isHuman = message.role === 'user';
  const botName = isBot && message.botId && botNames?.[message.botId];

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      return !isInline ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-lg relative",
      isHuman && "bg-blue-50",
      isBot && message.botId === 'bot1' && "bg-purple-50",
      isBot && message.botId === 'bot2' && "bg-fuchsia-50",
      isFacilitator && "bg-emerald-50"
    )}>
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold",
              isHuman && "text-blue-700",
              isBot && message.botId === 'bot1' && "text-purple-700",
              isBot && message.botId === 'bot2' && "text-fuchsia-700",
              isFacilitator && "text-emerald-700"
            )}>
              {isFacilitator ? 'Facilitator' : isBot && message.botId ? (botName || `Bot ${message.botId.replace('bot', '')}`) : 'Human'}
            </span>
            {message.metadata && (
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {message.metadata.responseTime}ms
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-4 w-4" />
                  {message.metadata.tokens} tokens
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  {message.metadata.temperature}
                </span>
              </div>
            )}
            {isBot && wasChecked && message.metadata?.facilitatorDecision && (
              <button 
                onClick={onInspect}
                className={cn(
                  "flex items-center gap-1 text-sm hover:opacity-80",
                  message.metadata?.facilitatorDecision === 'continue' ? "text-amber-500" : "text-emerald-600"
                )}
                title={message.metadata?.facilitatorDecision === 'continue' ? "View facilitator assessment (Continue)" : "View facilitator assessment (End)"}
              >
                {message.metadata?.facilitatorDecision === 'continue' ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          {message.role === 'user' ? (
            <div className="whitespace-pre-wrap">
              {message.content.startsWith('@facilitator') ? (
                <>
                  <span className="text-emerald-600 font-bold">@facilitator</span>
                  <span>{message.content.slice('@facilitator'.length)}</span>
                </>
              ) : message.content}
            </div>
          ) : (
            <ReactMarkdown components={components}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
      {isHuman && (
        <button
          onClick={onRestart}
          className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
          title="Restart conversation from this point"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
} 