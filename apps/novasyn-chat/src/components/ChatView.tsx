import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ContextBar } from './ContextBar';
import { MessageInput } from './MessageInput';
import { SearchBar } from './SearchBar';
import { TagPicker } from './TagPicker';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ChatMessage } from '../lib/types';

interface StreamDelta { requestId: string; delta: string; done: boolean; }

export function ChatView() {
  const chatMessages = useAppStore((s) => s.chatMessages);
  const loadChatMessagesForCurrentSession = useAppStore((s) => s.loadChatMessagesForCurrentSession);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const sessions = useAppStore((s) => s.sessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFolderItems] = useState<string[]>([]);
  const [folderItemsMap] = useState<Record<string, any>>({});
  const selectedModel = useAppStore((s) => s.selectedModel);
  const [activeDocCompiler, setActiveDocCompiler] = useState<string | null>(null);
  const [compileTitle, setCompileTitle] = useState('');
  const [compileStatus, setCompileStatus] = useState<string | null>(null);

  useEffect(() => { loadChatMessagesForCurrentSession(); }, [currentSessionId, loadChatMessagesForCurrentSession]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, streamingContent, currentSessionId]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setShowSearch((v) => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const displayMessages = searchResults ?? chatMessages;

  const handleSend = useCallback(async (text: string) => {
    const requestId = crypto.randomUUID();
    setStreamingContent('');
    const unlisten = await listen<StreamDelta>('chat-stream', (event) => {
      const { requestId: rid, delta, done } = event.payload;
      if (rid !== requestId || done) return;
      setStreamingContent((prev) => (prev ?? '') + delta);
    });
    try {
      const history = [...chatMessages]
        .filter((m) => !m.isExcluded && !m.isArchived)
        .flatMap((m) => [
          { role: 'user', content: m.userMessage },
          { role: 'assistant', content: m.aiMessage },
        ]);
      const response = await invoke<{
        content: string; model: string; provider: string;
        inputTokens: number; outputTokens: number;
      }>('send_chat', { request: { messages: [...history, { role: 'user', content: text }], model: selectedModel }, requestId });
      await invoke('create_chat_message', {
        input: {
          userMessage: text,
          aiMessage: response.content,
          userTokens: response.inputTokens || Math.ceil(text.length / 4),
          aiTokens: response.outputTokens || Math.ceil(response.content.length / 4),
          totalTokens: (response.inputTokens || 0) + (response.outputTokens || 0),
          model: response.model,
          provider: response.provider,
          userId: 'default-user',
          sessionId: currentSessionId,
        },
      });
      setStreamingContent(null);
      await loadChatMessagesForCurrentSession();
    } catch (err) {
      console.error('Send failed:', err);
      setStreamingContent(`Error: ${err}`);
      setTimeout(() => setStreamingContent(null), 5000);
    } finally { unlisten(); }
  }, [loadChatMessagesForCurrentSession, chatMessages, selectedModel, currentSessionId]);

  async function handleDocCompile(compilerName: string) {
    try {
      const safeTitle = compileTitle || new Date().toLocaleDateString();
      const msgIds = displayMessages.filter((m) => !m.isExcluded && !m.isArchived).map((m) => m.id);
      const outputPath = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
      await invoke(compilerName, { messageIds: msgIds, model: selectedModel, title: safeTitle, outputPath });
      setCompileStatus('\u2713 Document created');
      setActiveDocCompiler(null);
      setCompileTitle('');
      setTimeout(() => setCompileStatus(null), 3000);
    } catch (err) {
      setCompileStatus('Error: ' + String(err));
    }
  }

  return (
    <div className="flex flex-col h-full">
      {showSearch && (
        <SearchBar
          onResults={(results) => setSearchResults(results)}
          onClear={() => setSearchResults(null)}
        />
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {displayMessages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-400 mb-2">NovaSyn Chat</h2>
              <p className="text-sm text-gray-600">Built on Agicore. Start a conversation.</p>
              <p className="text-xs text-gray-700 mt-2">Ctrl+F to search</p>
            </div>
          </div>
        )}
        {displayMessages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} folders={folders} tags={tags} sessions={sessions} onRefresh={loadChatMessagesForCurrentSession} />
        ))}
        {streamingContent && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ContextBar selectedFolderItems={selectedFolderItems} folderItemsMap={folderItemsMap} onRemove={() => {}} />
      <div className="border-t border-slate-700/50">
        <div className="flex items-center gap-2 px-4 py-1.5">
          <span className="text-xs text-gray-500 flex-shrink-0">Compile →</span>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setActiveDocCompiler(activeDocCompiler === 'chat_to_skilldoc' ? null : 'chat_to_skilldoc')} className="text-xs text-blue-400 hover:text-blue-300 bg-slate-700/50 hover:bg-slate-700 px-2 py-0.5 rounded transition">Extract behavioral specifications from conversation</button>
            <button onClick={() => setActiveDocCompiler(activeDocCompiler === 'chat_to_requirements' ? null : 'chat_to_requirements')} className="text-xs text-blue-400 hover:text-blue-300 bg-slate-700/50 hover:bg-slate-700 px-2 py-0.5 rounded transition">Extract implementation requirements from discussion</button>
            <button onClick={() => setActiveDocCompiler(activeDocCompiler === 'chat_to_post' ? null : 'chat_to_post')} className="text-xs text-blue-400 hover:text-blue-300 bg-slate-700/50 hover:bg-slate-700 px-2 py-0.5 rounded transition">Transform discussion into a publishable blog post</button>
          </div>
          {compileStatus && <span className="text-xs text-green-400 ml-auto flex-shrink-0">{compileStatus}</span>}
        </div>
        {activeDocCompiler && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <input type="text" placeholder="Document title..." value={compileTitle} onChange={(e) => setCompileTitle(e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" />
            <button onClick={() => handleDocCompile(activeDocCompiler)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Generate</button>
            <button onClick={() => { setActiveDocCompiler(null); setCompileStatus(null); }} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded transition">Cancel</button>
          </div>
        )}
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}

function ChatMessageItem({ message, folders, tags: _tags, sessions, onRefresh }: {
  message: ChatMessage; folders: any[]; tags: any[]; sessions: any[];
  onRefresh: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [showExchangePicker, setShowExchangePicker] = useState(false);
  const [exchangeRating, setExchangeRating] = useState(3);
  const [savedAsExchange, setSavedAsExchange] = useState(false);

  const ts = new Date(message.createdAt);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const contextTokens = Math.ceil(message.userMessage.length / 4) + message.aiTokens;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.aiMessage);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  async function handleToggleExclude() {
    await invoke('update_chat_message', { id: message.id, input: { isExcluded: !message.isExcluded } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleToggleArchive() {
    await invoke('update_chat_message', { id: message.id, input: { isArchived: !message.isArchived } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleDelete() {
    await invoke('delete_chat_message', { id: message.id }); await onRefresh();
  }
  async function handleSaveToFolder(folderId: string) {
    try {
      await invoke('create_folder_item', { input: { content: message.aiMessage, tokens: message.aiTokens, itemType: 'ai-response', folderId } });
      setSavedFolderId(folderId); setShowFolderPicker(false); setMenuOpen(false);
      setTimeout(() => setSavedFolderId(null), 2000);
    } catch (err) { console.error('Save to folder failed:', err); }
  }
  async function handleMoveToSession(targetSessionId: string) {
    await invoke('update_chat_message', { id: message.id, input: { sessionId: targetSessionId } });
    await onRefresh(); setShowMovePicker(false); setMenuOpen(false);
  }
  async function handleSaveAsExchange() {
    try {
      await invoke('chat_to_exchange', { messageIds: [message.id], userId: 'default-user', rating: exchangeRating });
      setSavedAsExchange(true); setShowExchangePicker(false); setMenuOpen(false);
      setTimeout(() => setSavedAsExchange(false), 2000);
    } catch (err) { console.error('Save as exchange failed:', err); }
  }

  return (
    <>
      {showTagPicker && <TagPicker messageId={message.id} onClose={() => setShowTagPicker(false)} onTagged={onRefresh} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-[22rem] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white mb-2">Delete Message?</h2>
            <p className="text-xs text-gray-400 mb-4">This message will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={handleDelete} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={`group relative rounded-xl border transition-all ${
        message.isArchived ? 'opacity-40 border-slate-700 bg-slate-800/30'
          : message.isExcluded ? 'opacity-60 border-slate-700 bg-slate-800/40 border-dashed'
          : message.isPruned ? 'opacity-45 border-orange-700/40 bg-slate-800/30 border-dashed'
          : 'border-slate-700 bg-slate-800/60'
      }`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={handleCopy} className="text-xs text-gray-500 hover:text-white bg-slate-700 px-2 py-0.5 rounded transition">
            {copied ? '✓' : 'Copy'}
          </button>
          <div className="relative">
            <button onClick={() => { setMenuOpen(!menuOpen); setShowFolderPicker(false); setShowMovePicker(false); }} className="text-gray-500 hover:text-white text-lg leading-none px-1 bg-slate-700 rounded transition">⋮</button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 w-48 py-1">
                <button onClick={handleToggleExclude} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isExcluded ? '✓ Include in session' : '× Exclude from session'}
                </button>
                <button onClick={handleToggleArchive} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isArchived ? '📤 Unarchive' : '📥 Archive'}
                </button>
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setShowTagPicker(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">Tag message</button>
                {folders.length > 0 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowFolderPicker(!showFolderPicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>📁 Save to folder</span><span className="text-gray-400 text-xs">{showFolderPicker ? '▲' : '▶'}</span>
                    </button>
                    {showFolderPicker && (
                      <div className="bg-slate-800 border-t border-slate-600">
                        {folders.map((folder) => (
                          <button key={folder.id} onClick={() => handleSaveToFolder(folder.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition">{folder.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {sessions.length > 1 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowMovePicker(!showMovePicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>Move to...</span><span className="text-gray-400 text-xs">{showMovePicker ? '▲' : '▶'}</span>
                    </button>
                    {showMovePicker && (
                      <div className="bg-slate-800 border-t border-slate-600 max-h-40 overflow-y-auto">
                        {sessions.map((s) => (
                          <button key={s.id} onClick={() => handleMoveToSession(s.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition truncate">{s.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                
                <hr className="border-slate-600 my-1" />
                <button onClick={() => setShowExchangePicker(!showExchangePicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                  <span>★ Save as Exchange</span><span className="text-gray-400 text-xs">{showExchangePicker ? '\u25b2' : '\u25b6'}</span>
                </button>
                {showExchangePicker && (
                  <div className="bg-slate-800 border-t border-slate-600 px-3 py-2">
                    <div className="flex items-center gap-1 mb-2">
                      {[1,2,3,4,5].map((n) => (
                        <button key={n} onClick={() => setExchangeRating(n)} className={n <= exchangeRating ? 'text-yellow-400 text-base' : 'text-gray-600 text-base'}>★</button>
                      ))}
                      <span className="text-xs text-gray-500 ml-1">Rating</span>
                    </div>
                    <button onClick={handleSaveAsExchange} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition w-full">Save to Exchange Library</button>
                  </div>
                )}
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 transition">Delete</button>
              </div>
            )}
          </div>
        </div>
        {menuOpen && <div className="fixed inset-0 z-0" onClick={() => { setMenuOpen(false); setShowFolderPicker(false); setShowMovePicker(false); }} />}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">U</div>
            <div className="flex-1 min-w-0"><p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{message.userMessage}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
            <div className="flex-1 min-w-0"><MarkdownRenderer content={message.aiMessage} /></div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-gray-600">{timeStr}</span>
            <span className="text-xs text-gray-600 bg-slate-700/50 px-1.5 py-0.5 rounded">{message.model}</span>
            <span className="text-xs text-gray-600">~{contextTokens.toLocaleString()} tokens</span>
            {message.isPruned && <span className="text-xs text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">pruned</span>}
            {message.isExcluded && <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">excluded</span>}
            {message.isArchived && <span className="text-xs text-gray-500 bg-slate-700/50 px-1.5 py-0.5 rounded">archived</span>}
            {savedFolderId && <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">✓ saved</span>}
            {savedAsExchange && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">★ saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
