import React, { useRef, useEffect } from 'react';
import { useCodeStore } from '../store/codeStore';
import ChatMessageItem from './ChatMessageItem';
import MessageInput from './MessageInput';

export default function ChatPanel() {
  const { messages, currentSessionId, streamingText, isSending } = useCodeStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionMessages = messages.filter(
    (m) => m.sessionId === currentSessionId && !m.isExcluded
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages.length, streamingText]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sessionMessages.length === 0 && !isSending && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold text-slate-300 mb-2">NovaSyn Code</h2>
              <p className="text-sm text-slate-500">
                Describe what you want to build. I'll write the code, you apply it to your project.
              </p>
            </div>
          </div>
        )}

        {sessionMessages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {/* Streaming preview */}
        {isSending && streamingText && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-blue-400 mb-2 font-medium">Assistant</div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">{streamingText}</div>
          </div>
        )}

        {/* Typing indicator */}
        {isSending && !streamingText && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-blue-400 mb-2 font-medium">Assistant</div>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <MessageInput />
    </div>
  );
}
