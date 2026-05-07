import React, { useState, useEffect, useRef } from 'react';
import { useForgeStore } from '../store/forgeStore';
import type { AiRole, Conversation } from '../../shared/types';

const ROLE_COLORS: Record<AiRole, string> = {
  architect: 'text-blue-400',
  builder: 'text-green-400',
  reviewer: 'text-purple-400',
};

const ROLE_BG: Record<AiRole, string> = {
  architect: 'bg-blue-500/10 border-blue-500/20',
  builder: 'bg-green-500/10 border-green-500/20',
  reviewer: 'bg-purple-500/10 border-purple-500/20',
};

const ROLE_LABELS: Record<AiRole, string> = {
  architect: 'Architect',
  builder: 'Builder',
  reviewer: 'Reviewer',
};

export function ChatPanel() {
  const {
    conversations,
    currentConversationId,
    currentProjectId,
    models,
    settings,
    streamingText,
    isStreaming,
    setCurrentConversationId,
    addConversation,
    updateConversation,
    removeConversation,
    setStreamingText,
    appendStreamingText,
    setIsStreaming,
  } = useForgeStore();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings?.defaultModel || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  // Set default model when settings load
  useEffect(() => {
    if (settings?.defaultModel && !selectedModel) {
      setSelectedModel(settings.defaultModel);
    }
  }, [settings]);

  // Subscribe to streaming deltas
  useEffect(() => {
    const unsubscribe = window.electronAPI.onChatDelta((text: string) => {
      appendStreamingText(text);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll on new messages or streaming text
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, streamingText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 4 * 24; // ~4 lines
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [inputText]);

  async function handleNewChat(role: AiRole) {
    if (!currentProjectId) return;
    setShowRoleMenu(false);
    const convo = await window.electronAPI.createConversation(currentProjectId, role);
    addConversation(convo);
    setCurrentConversationId(convo.id);
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await window.electronAPI.deleteConversation(id);
    removeConversation(id);
  }

  async function handleSend() {
    if (!inputText.trim() || !currentConversationId || !currentConversation || isStreaming) return;

    const message = inputText.trim();
    setInputText('');

    // Optimistically add user message
    const userMsg = { role: 'user' as const, content: message, timestamp: new Date().toISOString() };
    const updatedMessages = [...currentConversation.messages, userMsg];
    updateConversation(currentConversationId, { messages: updatedMessages });

    // Start streaming
    setStreamingText('');
    setIsStreaming(true);

    try {
      const assistantMsg = await window.electronAPI.sendChat(
        currentConversationId,
        message,
        selectedModel,
      );

      // Add the complete assistant message
      const finalMessages = [...updatedMessages, assistantMsg];
      updateConversation(currentConversationId, {
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Show error as a system message
      const errorMsg = {
        role: 'assistant' as const,
        content: `Error: ${err instanceof Error ? err.message : 'Chat request failed'}`,
        timestamp: new Date().toISOString(),
      };
      updateConversation(currentConversationId, {
        messages: [...updatedMessages, errorMsg],
      });
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar — conversation list */}
      <div className="w-56 flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50">
        {/* New Chat button */}
        <div className="p-3 border-b border-slate-700 relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition"
          >
            + New Chat
          </button>
          {showRoleMenu && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 overflow-hidden">
              {(['architect', 'builder', 'reviewer'] as AiRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleNewChat(role)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition ${ROLE_COLORS[role]}`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-xs text-gray-500 text-center">
              No conversations yet
            </div>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => setCurrentConversationId(convo.id)}
                className={`px-3 py-2.5 cursor-pointer border-b border-slate-800 group transition ${
                  currentConversationId === convo.id
                    ? 'bg-slate-800'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${ROLE_COLORS[convo.role]}`}
                  >
                    {convo.role}
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(convo.id, e)}
                    className="text-gray-600 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    &#215;
                  </button>
                </div>
                <div className="text-xs text-gray-300 truncate mt-0.5">
                  {convo.title}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {convo.messages.length} message{convo.messages.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right area — messages + input */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!currentConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a conversation or start a new chat
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-700 flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${ROLE_BG[currentConversation.role]} ${ROLE_COLORS[currentConversation.role]}`}
              >
                {currentConversation.role}
              </span>
              <span className="text-sm text-gray-300">{currentConversation.title}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {currentConversation.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-800 text-gray-200'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div
                        className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${ROLE_COLORS[currentConversation.role]}`}
                      >
                        {currentConversation.role}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-[10px] text-gray-500 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {isStreaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-3 py-2 rounded-lg text-sm bg-slate-800 text-gray-200">
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${ROLE_COLORS[currentConversation.role]}`}
                    >
                      {currentConversation.role}
                    </div>
                    <div className="whitespace-pre-wrap">{streamingText}</div>
                  </div>
                </div>
              )}

              {/* Streaming indicator when no text yet */}
              {isStreaming && !streamingText && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-lg text-sm bg-slate-800 text-gray-400">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3">
              <div className="flex items-end gap-2">
                {/* Model selector */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500"
                  disabled={isStreaming}
                >
                  {models.length === 0 ? (
                    <option value="">No models</option>
                  ) : (
                    models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={isStreaming || !inputText.trim()}
                  className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white text-xs px-4 py-2 rounded-lg transition"
                >
                  {isStreaming ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
