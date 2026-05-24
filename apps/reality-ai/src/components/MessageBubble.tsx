import React, { useState } from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === 'user';

  const formatTime = (s: string): string => {
    try {
      return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className={`flex items-start gap-2.5 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-muted)] flex items-center justify-center mt-0.5">
            <span className="text-xs font-bold text-[var(--accent)]">R</span>
          </div>
        )}
        <div className="relative">
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-[var(--bg-user-bubble)] rounded-2xl rounded-tr-md'
                : 'bg-[var(--bg-assistant-bubble)] border border-[var(--border)] rounded-2xl rounded-tl-md'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-[var(--text-primary)]">
              {message.content}
            </p>
          </div>
          {showTimestamp && (
            <div
              className={`absolute top-full mt-1 text-[10px] text-[var(--text-muted)] whitespace-nowrap ${
                isUser ? 'right-0' : 'left-0'
              }`}
            >
              {formatTime(message.createdAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
