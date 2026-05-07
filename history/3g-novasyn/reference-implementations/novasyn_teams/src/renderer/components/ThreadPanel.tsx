import React, { useEffect, useRef } from 'react';
import { useTeamsStore } from '../store/teamsStore';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';

export function ThreadPanel() {
  const messages = useTeamsStore((s) => s.messages);
  const threadMessages = useTeamsStore((s) => s.threadMessages);
  const activeThreadParentId = useTeamsStore((s) => s.activeThreadParentId);
  const closeThread = useTeamsStore((s) => s.closeThread);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Find the parent message
  const parentMessage = messages.find((m) => m.id === activeThreadParentId);

  // Auto-scroll to bottom when new replies arrive
  useEffect(() => {
    if (threadMessages.length > prevCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = threadMessages.length;
  }, [threadMessages.length]);

  // Also scroll on thread change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeThreadParentId]);

  if (!activeThreadParentId || !parentMessage) {
    return (
      <div className="w-[300px] bg-slate-850 border-l border-slate-700 flex flex-col">
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Select a message to view its thread
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] bg-slate-900/50 border-l border-slate-700 flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="text-sm font-semibold text-white truncate">Thread</h3>
          <span className="text-xs text-gray-500">
            {threadMessages.length} repl{threadMessages.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        <button
          onClick={closeThread}
          className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0 ml-2"
          title="Close thread"
        >
          &times;
        </button>
      </div>

      {/* Parent message */}
      <div className="border-b border-slate-700/50 bg-slate-800/30">
        <MessageItem message={parentMessage} isThreadReply />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto">
        {threadMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-xs">
            No replies yet. Start the conversation.
          </div>
        ) : (
          <div className="py-1">
            {/* Replies separator */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-gray-500">
                {threadMessages.length} repl{threadMessages.length === 1 ? 'y' : 'ies'}
              </span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {threadMessages.map((msg) => (
              <MessageItem key={msg.id} message={msg} isThreadReply />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Thread reply input */}
      <MessageInput
        replyTo={activeThreadParentId}
        placeholder="Reply in thread..."
      />
    </div>
  );
}
