import React, { useState, useRef, useEffect } from 'react';
import { useCouncilStore } from '../store/councilStore';

export default function SoloChat() {
  const {
    currentPersona,
    conversations,
    currentConversation,
    conversationMessages,
    aiLoading,
    streamingContent,
    extractingMemories,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    regenerateResponse,
    exportConversation,
    extractMemoriesFromConversation,
  } = useCouncilStore();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, aiLoading, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Ctrl+F to toggle search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && currentConversation) {
        e.preventDefault();
        setShowSearch(prev => !prev);
        if (showSearch) setSearchQuery('');
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentConversation, showSearch]);

  if (!currentPersona) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || aiLoading) return;

    setInput('');
    setError('');

    // Auto-create conversation if none selected
    if (!currentConversation) {
      await createConversation(currentPersona.id);
    }

    try {
      await sendMessage(trimmed);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTitleSave = () => {
    if (titleDraft.trim() && currentConversation && titleDraft.trim() !== currentConversation.title) {
      renameConversation(currentConversation.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(false);
  };

  const handleRegenerate = async () => {
    if (aiLoading) return;
    setError('');
    try {
      await regenerateResponse();
    } catch (e: any) {
      setError(e.message || 'Failed to regenerate');
    }
  };

  // Check if the last message is from AI (for regenerate button)
  const lastMsg = conversationMessages.length > 0 ? conversationMessages[conversationMessages.length - 1] : null;
  const canRegenerate = lastMsg?.senderType === 'persona' && !aiLoading;

  // Show conversation list if no conversation selected
  if (!currentConversation) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-surface-300">Conversations</h2>
          <button
            onClick={() => createConversation(currentPersona.id)}
            className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            + New Chat
          </button>
        </div>

        {conversations.length > 0 ? (
          <div className="space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className="group flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 cursor-pointer transition-colors"
                onClick={() => selectConversation(conv)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-200 truncate">{conv.title}</p>
                  <div className="flex items-center gap-3 text-[10px] text-surface-500 mt-0.5">
                    <span>{conv.messageCount} messages</span>
                    <span>{conv.totalTokens.toLocaleString()} tokens</span>
                    <span>${conv.totalCost.toFixed(4)}</span>
                    <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation?')) {
                      deleteConversation(conv.id);
                    }
                  }}
                  className="px-2 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm text-surface-500 mb-1">No conversations yet</p>
            <p className="text-xs text-surface-600 mb-4">
              Start chatting with {currentPersona.name}
            </p>
            <button
              onClick={() => createConversation(currentPersona.id)}
              className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
            >
              Start Conversation
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active conversation view
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => useCouncilStore.setState({ currentConversation: null, conversationMessages: [] })}
            className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-surface-500">|</span>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-sm text-surface-200 bg-transparent border-b border-primary-500 focus:outline-none px-0 py-0"
            />
          ) : (
            <button
              onClick={() => {
                setTitleDraft(currentConversation.title);
                setEditingTitle(true);
              }}
              className="text-sm text-surface-300 hover:text-surface-100 transition-colors"
              title="Click to rename"
            >
              {currentConversation.title}
            </button>
          )}
          <span className="text-[10px] text-surface-500">
            {conversationMessages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-surface-500">
          <span>{currentConversation.totalTokens.toLocaleString()} tokens</span>
          <span>${currentConversation.totalCost.toFixed(4)}</span>
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
            className={`ml-1 px-2 py-0.5 rounded transition-colors border ${
              showSearch
                ? 'bg-primary-600/20 text-primary-300 border-primary-600/30'
                : 'bg-white/5 hover:bg-white/10 text-surface-400 border-white/10'
            }`}
            title="Search messages (Ctrl+F)"
          >
            Search
          </button>
          <button
            onClick={exportConversation}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-surface-400 border border-white/10 rounded transition-colors"
            title="Export as Markdown"
          >
            Export
          </button>
          {conversationMessages.length >= 2 && (
            <button
              onClick={extractMemoriesFromConversation}
              disabled={extractingMemories || aiLoading}
              className="px-2 py-0.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-600/20 rounded transition-colors disabled:opacity-40"
            >
              {extractingMemories ? 'Extracting...' : 'Extract Memories'}
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-white/5 bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 px-2 py-1 text-xs bg-[var(--bg-input)] border border-white/10 rounded text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
            />
            {searchQuery && (
              <span className="text-[10px] text-surface-500 shrink-0">
                {conversationMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length} matches
              </span>
            )}
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="text-surface-500 hover:text-surface-300 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.length === 0 && !aiLoading && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">{currentPersona.avatarEmoji}</p>
            <p className="text-sm text-surface-400 mb-1">Chat with {currentPersona.name}</p>
            <p className="text-xs text-surface-500">{currentPersona.role}</p>
          </div>
        )}

        {conversationMessages
          .filter(msg => !searchQuery || msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((msg) => {
            const isLast = msg.id === conversationMessages[conversationMessages.length - 1]?.id;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                personaEmoji={currentPersona.avatarEmoji}
                personaName={currentPersona.name}
                searchHighlight={searchQuery}
                isLastAi={msg.senderType === 'persona' && isLast}
                canRegenerate={canRegenerate && msg.senderType === 'persona' && isLast}
                onRegenerate={handleRegenerate}
              />
            );
          })}

        {aiLoading && (
          <div className="flex items-start gap-3">
            <div className="text-lg shrink-0">{currentPersona.avatarEmoji}</div>
            <div className="max-w-[80%]">
              <div className="rounded-lg px-4 py-3 bg-white/[0.03] border border-white/5">
                {streamingContent ? (
                  <div className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
                    <MarkdownContent content={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-primary-400/60 ml-0.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-600/10 border border-red-600/20 rounded-lg text-xs text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-300 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentPersona.name}...`}
            rows={1}
            disabled={aiLoading}
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiLoading}
            className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-surface-600 mt-1">
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ message, personaEmoji, personaName, searchHighlight, isLastAi, canRegenerate, onRegenerate }: {
  message: any;
  personaEmoji: string;
  personaName: string;
  searchHighlight?: string;
  isLastAi: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHuman = message.senderType === 'human';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`flex items-start gap-3 group ${isHuman ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="text-lg shrink-0">
        {isHuman ? '👤' : personaEmoji}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isHuman ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-4 py-3 relative ${
          isHuman
            ? 'bg-primary-600/20 border border-primary-500/20'
            : 'bg-white/[0.03] border border-white/5'
        } ${searchHighlight ? 'ring-1 ring-yellow-500/30' : ''}`}>
          <div className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
            <MarkdownContent content={message.content} />
          </div>

          {/* Copy button — appears on hover */}
          <button
            onClick={handleCopy}
            className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] rounded transition-all ${
              copied
                ? 'bg-green-600/20 text-green-300'
                : 'bg-white/5 text-surface-500 hover:text-surface-200 opacity-0 group-hover:opacity-100'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Meta info + regenerate */}
        <div className={`flex items-center gap-2 mt-1 text-[10px] text-surface-600 ${isHuman ? 'justify-end' : ''}`}>
          <span>{isHuman ? 'You' : personaName}</span>
          {message.responseTimeMs && (
            <span>{(message.responseTimeMs / 1000).toFixed(1)}s</span>
          )}
          {message.tokensIn != null && message.tokensOut != null && (
            <span>{message.tokensIn + message.tokensOut} tokens</span>
          )}
          {message.cost != null && message.cost > 0 && (
            <span>${message.cost.toFixed(4)}</span>
          )}
          {canRegenerate && (
            <button
              onClick={onRegenerate}
              className="ml-1 text-surface-500 hover:text-surface-200 transition-colors"
              title="Regenerate response"
            >
              ↻ Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simple Markdown Rendering ───────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering: bold, italic, code blocks, inline code, headers
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        elements.push(
          <pre key={i} className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto border border-white/5">
            <code className="text-xs text-surface-300 font-mono">{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-surface-200 mt-3 mb-1">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-surface-200 mt-3 mb-1">{line.slice(3)}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-surface-200 mt-3 mb-1">{line.slice(2)}</h2>);
      continue;
    }

    // List items
    if (line.match(/^\s*[-*]\s/)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-surface-500 shrink-0">•</span>
          <span>{renderInline(line.replace(/^\s*[-*]\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^\s*(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2">
            <span className="text-surface-500 shrink-0">{match[1]}.</span>
            <span>{renderInline(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{renderInline(line)}</p>);
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Process inline code, bold, italic
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        <code key={key++} className="bg-black/30 px-1 py-0.5 rounded text-xs text-primary-300 font-mono">
          {codeMatch[2]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++} className="font-semibold text-surface-100">{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // No more patterns
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
}
