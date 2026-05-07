import React, { useEffect, useRef } from 'react';
import { useTeamsStore } from '../store/teamsStore';
import { ChannelHeader } from './ChannelHeader';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';

export function ChannelView() {
  const messages = useTeamsStore((s) => s.messages);
  const currentChannelId = useTeamsStore((s) => s.currentChannelId);
  const channels = useTeamsStore((s) => s.channels);
  const isLoading = useTeamsStore((s) => s.isLoading);
  const loadThread = useTeamsStore((s) => s.loadThread);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const currentChannel = channels.find((c) => c.id === currentChannelId);

  // Filter top-level messages (no reply_to, or reply_to that exists in the channel)
  const topLevelMessages = messages.filter((m) => !m.replyTo);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (topLevelMessages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = topLevelMessages.length;
  }, [topLevelMessages.length]);

  // Also scroll on channel change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [currentChannelId]);

  const handleOpenThread = (messageId: string) => {
    loadThread(messageId);
  };

  if (!currentChannelId || !currentChannel) {
    return (
      <div className="flex-1 flex flex-col bg-slate-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-400">Select a channel</h3>
            <p className="text-sm text-gray-500 mt-1">Choose a channel from the sidebar to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-800 min-w-0">
      {/* Channel header */}
      <ChannelHeader />

      {/* Message list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-sm text-gray-400">Loading messages...</span>
            </div>
          </div>
        ) : topLevelMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-base font-medium text-gray-400">No messages yet</h3>
              <p className="text-sm text-gray-500 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {/* Channel welcome header */}
            <div className="px-4 py-4 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {currentChannel.isDirect ? '' : '# '}{currentChannel.name}
              </h2>
              {currentChannel.description && !currentChannel.isDirect && (
                <p className="text-sm text-gray-400 mt-1">{currentChannel.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                This is the start of <span className="font-semibold text-gray-400">
                  {currentChannel.isDirect ? 'your conversation' : `#${currentChannel.name}`}
                </span>.
              </p>
            </div>

            {/* Divider */}
            <div className="border-b border-slate-700 mx-4 mb-2" />

            {/* Messages */}
            {topLevelMessages.map((message, idx) => {
              // Date separator
              const prevMessage = idx > 0 ? topLevelMessages[idx - 1] : null;
              const showDateSep = shouldShowDateSeparator(prevMessage?.createdAt, message.createdAt);

              return (
                <React.Fragment key={message.id}>
                  {showDateSep && (
                    <DateSeparator date={message.createdAt} />
                  )}
                  <MessageItem
                    message={message}
                    onOpenThread={handleOpenThread}
                  />
                </React.Fragment>
              );
            })}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <MessageInput placeholder={`Message ${currentChannel.isDirect ? currentChannel.name : '#' + currentChannel.name}`} />
    </div>
  );
}

// --- Date separator ---
function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let label: string;
  if (isToday) {
    label = 'Today';
  } else if (isYesterday) {
    label = 'Yesterday';
  } else {
    label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 my-1">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  );
}

function shouldShowDateSeparator(prevDate: string | undefined, currDate: string): boolean {
  if (!prevDate) return true;
  const prev = new Date(prevDate).toDateString();
  const curr = new Date(currDate).toDateString();
  return prev !== curr;
}
