import React, { useState, useRef, useCallback } from 'react';
import { useCodeStore } from '../store/codeStore';
import ModelSelector from './ModelSelector';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isSending, selectedModels, currentSessionId, messages,
    contextFiles, contextTokens,
    setIsSending, setStreamingText, addMessage,
  } = useCodeStore();

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const modelId = selectedModels[0] || 'claude-sonnet-4-6';
    const userMessage = input.trim();
    setInput('');
    setIsSending(true);
    setStreamingText('');

    // Ensure we have a session
    let sessionId = currentSessionId;
    if (!sessionId) {
      const session = await window.electronAPI.createSession('New Chat');
      useCodeStore.getState().addSession(session);
      useCodeStore.getState().setCurrentSessionId(session.id);
      sessionId = session.id;
    }

    try {
      // Subscribe to streaming deltas
      const unsub = window.electronAPI.onChatDelta((text) => {
        useCodeStore.getState().setStreamingText(
          useCodeStore.getState().streamingText + text
        );
      });

      const sessionMessages = messages.filter((m) => m.sessionId === sessionId && !m.isExcluded);
      const chatHistory = sessionMessages.map((m) => ({
        ...m,
      }));

      const storeContextFiles = useCodeStore.getState().contextFiles;

      const result = await window.electronAPI.sendChat(userMessage, modelId, {
        sessionId: sessionId!,
        chatHistory,
        contextFiles: storeContextFiles,
      });

      unsub();
      addMessage(result);

      // Auto-name session if still default
      const session = useCodeStore.getState().sessions.find((s) => s.id === sessionId);
      if (session && session.name === 'New Chat') {
        const autoName = userMessage.split(' ').slice(0, 6).join(' ');
        await window.electronAPI.updateSession(sessionId!, { name: autoName });
        useCodeStore.getState().updateSessionName(sessionId!, autoName);
      }
    } catch (err: any) {
      useCodeStore.getState().setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
      setStreamingText('');
    }
  }, [input, isSending, selectedModels, currentSessionId, messages, setIsSending, setStreamingText, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTokens = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };

  return (
    <div className="p-3 border-t border-slate-700 bg-slate-900/50">
      {contextFiles.length > 0 && (
        <div className="text-[11px] text-slate-500 mb-1.5 px-1">
          {contextFiles.length} file{contextFiles.length !== 1 ? 's' : ''} in context &middot; {formatTokens(contextTokens)} tokens
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          disabled={isSending}
          rows={1}
          className="flex-1 bg-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 resize-none placeholder-slate-600 disabled:opacity-50"
          style={{ minHeight: '38px', maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
        <ModelSelector />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
