import React from 'react';
import type { ChatMessage } from '../../shared/types';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  message: ChatMessage;
}

export default function ChatMessageItem({ message }: Props) {
  const modelName = message.model.split('/').pop() || message.model;

  return (
    <div className="space-y-3">
      {/* User message */}
      <div className="flex justify-end">
        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg px-4 py-3 max-w-[85%]">
          <div className="text-sm text-slate-200 whitespace-pre-wrap">{message.userMessage}</div>
        </div>
      </div>

      {/* AI response */}
      {message.aiMessage && (
        <div className="bg-slate-800/50 rounded-lg px-4 py-3">
          <MarkdownRenderer content={message.aiMessage} />
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700/50">
            <span className="text-[10px] text-slate-600">{modelName}</span>
            <span className="text-[10px] text-slate-600">{message.totalTokens} tokens</span>
            <span className="text-[10px] text-slate-600">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
