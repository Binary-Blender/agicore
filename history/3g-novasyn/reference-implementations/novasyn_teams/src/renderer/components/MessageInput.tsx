import React, { useState, useRef, useEffect } from 'react';
import { useTeamsStore } from '../store/teamsStore';

interface Props {
  replyTo?: string;
  placeholder?: string;
}

export function MessageInput({ replyTo, placeholder }: Props) {
  const sendMessage = useTeamsStore((s) => s.sendMessage);
  const members = useTeamsStore((s) => s.members);
  const setShowVaultBrowser = useTeamsStore((s) => s.setShowVaultBrowser);
  const currentChannelId = useTeamsStore((s) => s.currentChannelId);

  const [content, setContent] = useState('');
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [vaultShareMode, setVaultShareMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filtered members for @mention popup
  const filteredMembers = members.filter((m) =>
    m.displayName.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [content]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || !currentChannelId) return;

    await sendMessage(trimmed, 'text', undefined, replyTo);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleAIInvoke = async () => {
    const trimmed = content.trim();
    if (!trimmed || !currentChannelId) return;

    // Send as a message that mentions BabyAI
    const aiContent = trimmed.startsWith('@BabyAI') ? trimmed : `@BabyAI ${trimmed}`;
    await sendMessage(aiContent, 'text', undefined, replyTo);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention popup navigation
    if (showMentionPopup) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[mentionIndex]) {
          insertMention(filteredMembers[mentionIndex].displayName);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionPopup(false);
        return;
      }
    }

    // Send on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Detect @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentionPopup(true);
      setMentionFilter(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentionPopup(false);
    }
  };

  const insertMention = (displayName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursorPos = ta.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf('@');

    if (mentionStart >= 0) {
      const newText = textBeforeCursor.slice(0, mentionStart) + `@${displayName} ` + textAfterCursor;
      setContent(newText);
      setShowMentionPopup(false);

      // Set cursor after mention
      setTimeout(() => {
        const newPos = mentionStart + displayName.length + 2;
        ta.focus();
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handleVaultShare = () => {
    setVaultShareMode(true);
    setShowVaultBrowser(true);
  };

  return (
    <div className="relative px-4 py-3 border-t border-slate-700 bg-slate-800/80">
      {/* @mention popup */}
      {showMentionPopup && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 mb-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 w-56 max-h-48 overflow-y-auto z-20">
          {filteredMembers.map((member, idx) => (
            <button
              key={member.id}
              onClick={() => insertMention(member.displayName)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition ${
                idx === mentionIndex ? 'bg-teal-600/30 text-white' : 'text-gray-300 hover:bg-slate-600'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: member.avatarColor }}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate">{member.displayName}</span>
              {member.isSelf && <span className="text-xs text-gray-500 ml-auto">you</span>}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 bg-slate-700 border border-slate-600 rounded-lg focus-within:border-teal-500 transition">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message...'}
            rows={1}
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          {/* Vault share button */}
          <button
            onClick={handleVaultShare}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
            title="Share from Vault"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>

          {/* AI button */}
          <button
            onClick={handleAIInvoke}
            disabled={!content.trim()}
            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-slate-700 rounded-lg transition disabled:opacity-30 disabled:cursor-default"
            title="Ask BabyAI"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition disabled:opacity-30 disabled:cursor-default"
            title="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
