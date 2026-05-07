import React, { useState } from 'react';
import { useTeamsStore } from '../store/teamsStore';
import type { Message, Member } from '../../shared/types';

interface Props {
  message: Message;
  onOpenThread?: (messageId: string) => void;
  isThreadReply?: boolean;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

export function MessageItem({ message, onOpenThread, isThreadReply = false }: Props) {
  const members = useTeamsStore((s) => s.members);
  const messages = useTeamsStore((s) => s.messages);
  const editMessage = useTeamsStore((s) => s.editMessage);
  const deleteMessage = useTeamsStore((s) => s.deleteMessage);
  const pinMessage = useTeamsStore((s) => s.pinMessage);
  const reactToMessage = useTeamsStore((s) => s.reactToMessage);
  const setShowVaultBrowser = useTeamsStore((s) => s.setShowVaultBrowser);

  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const sender = members.find((m) => m.id === message.senderId);
  const selfMember = members.find((m) => m.isSelf);
  const isOwnMessage = selfMember?.id === message.senderId;

  // Parse metadata for reactions
  const metadata = (() => {
    try {
      return typeof message.metadata === 'string' ? JSON.parse(message.metadata) : (message.metadata || {});
    } catch {
      return {};
    }
  })();
  const reactions: Record<string, string[]> = metadata.reactions || {};

  // Count thread replies
  const replyCount = messages.filter((m) => m.replyTo === message.id).length;

  const formatTimestamp = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? time : `${d.toLocaleDateString()} ${time}`;
  };

  const getAvatarColor = (): string => sender?.avatarColor || '#6b7280';
  const getInitial = (): string => (sender?.displayName || 'U').charAt(0).toUpperCase();
  const getDisplayName = (): string => sender?.displayName || 'Unknown';

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this message?')) {
      await deleteMessage(message.id);
    }
  };

  const handlePin = () => pinMessage(message.id, !message.isPinned);
  const handleReact = (emoji: string) => {
    reactToMessage(message.id, emoji);
    setShowReactionPicker(false);
  };

  const handleSaveToVault = async () => {
    try {
      await window.electronAPI.vaultStore({
        itemType: 'note',
        title: `Message from ${getDisplayName()}`,
        content: message.content,
        metadata: { channelId: message.channelId, senderId: message.senderId },
      });
    } catch (err) {
      console.error('Failed to save to vault:', err);
    }
  };

  // --- System message ---
  if (message.messageType === 'system') {
    return (
      <div className="flex items-center justify-center py-2 px-4">
        <span className="text-xs text-gray-500 italic">{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={`group relative px-4 py-1.5 hover:bg-slate-800/50 transition ${
        message.isPinned ? 'border-l-2 border-yellow-500/50' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Pinned indicator */}
      {message.isPinned && (
        <div className="flex items-center gap-1 mb-0.5 ml-10">
          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.8L9 4.323V3a1 1 0 011-1z" />
          </svg>
          <span className="text-xs text-yellow-500">Pinned</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
          style={{ backgroundColor: getAvatarColor() }}
        >
          {getInitial()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: name + timestamp */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">{getDisplayName()}</span>
            {message.messageType === 'ai_response' && (
              <span className="text-xs bg-teal-600/30 text-teal-300 px-1.5 py-0.5 rounded">AI</span>
            )}
            <span className="text-xs text-gray-500">{formatTimestamp(message.createdAt)}</span>
            {message.updatedAt !== message.createdAt && (
              <span className="text-xs text-gray-600">(edited)</span>
            )}
          </div>

          {/* Message body */}
          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                  if (e.key === 'Escape') { setIsEditing(false); setEditContent(message.content); }
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-teal-500 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-1">
                <button onClick={handleEdit} className="text-xs text-teal-400 hover:text-teal-300">Save</button>
                <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="text-xs text-gray-400 hover:text-gray-300">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5">
              {message.messageType === 'vault_share' ? (
                <VaultShareContent content={message.content} vaultItemId={message.vaultItemId} />
              ) : (
                <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                  {renderMessageContent(message.content)}
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {Object.entries(reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition ${
                    userIds.includes(selfMember?.id || '')
                      ? 'bg-teal-600/20 border-teal-500/50 text-teal-300'
                      : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread indicator */}
          {!isThreadReply && replyCount > 0 && (
            <button
              onClick={() => onOpenThread?.(message.id)}
              className="flex items-center gap-1 mt-1.5 text-xs text-teal-400 hover:text-teal-300 hover:underline transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>
      </div>

      {/* Hover actions toolbar */}
      {showActions && !isEditing && (
        <div className="absolute top-0 right-4 -translate-y-1/2 flex items-center bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden">
          {/* Reply */}
          {!isThreadReply && (
            <button
              onClick={() => onOpenThread?.(message.id)}
              className="px-2 py-1 text-gray-400 hover:text-white hover:bg-slate-600 transition"
              title="Reply in thread"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}

          {/* React */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="px-2 py-1 text-gray-400 hover:text-white hover:bg-slate-600 transition"
              title="Add reaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showReactionPicker && (
              <div className="absolute top-full right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg p-1.5 flex gap-1 z-10">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-600 rounded transition text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pin */}
          <button
            onClick={handlePin}
            className={`px-2 py-1 hover:bg-slate-600 transition ${
              message.isPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
            }`}
            title={message.isPinned ? 'Unpin' : 'Pin'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.8L9 4.323V3a1 1 0 011-1z" />
            </svg>
          </button>

          {/* Edit (own messages only) */}
          {isOwnMessage && (
            <button
              onClick={() => { setIsEditing(true); setEditContent(message.content); }}
              className="px-2 py-1 text-gray-400 hover:text-white hover:bg-slate-600 transition"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Delete (own messages only) */}
          {isOwnMessage && (
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-slate-600 transition"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Save to Vault */}
          <button
            onClick={handleSaveToVault}
            className="px-2 py-1 text-gray-400 hover:text-white hover:bg-slate-600 transition"
            title="Save to Vault"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// --- Helper: Render message content with @mention highlights ---
function renderMessageContent(content: string): React.ReactNode {
  // Simple @mention highlighting
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-teal-400 bg-teal-600/20 px-0.5 rounded font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

// --- Vault share content renderer ---
function VaultShareContent({ content, vaultItemId }: { content: string; vaultItemId?: string | null }) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mt-1">
      <div className="flex items-center gap-2 mb-1.5">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <span className="text-xs font-medium text-blue-400">Vault Item</span>
      </div>
      <div className="text-sm text-gray-200 whitespace-pre-wrap">{content}</div>
      {vaultItemId && (
        <div className="text-xs text-gray-500 mt-1.5">ID: {vaultItemId}</div>
      )}
    </div>
  );
}
