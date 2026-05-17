import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ContextBar } from './ContextBar';
import { MessageInput } from './MessageInput';
import { SearchBar } from './SearchBar';
import { TagPicker } from './TagPicker';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { webSearch } from '../lib/api';
import { modelLabel, modelContextWindow, broadcastModelIds } from '../lib/models';
import { ContextWindowViewer } from './ContextWindowViewer';
import type { ChatMessage, ChatMessageAlternative } from '../lib/types';

interface SearchResult { title: string; snippet: string; url: string; source: string; }

const SEARCH_CONTEXT_PREFIX = '[web-search-context]';

function buildSearchContext(query: string, results: SearchResult[]): string {
  if (!results.length) return `${SEARCH_CONTEXT_PREFIX} No results found for "${query}".`;
  const body = results.map((r, i) => {
    const title = r.title?.trim() ? `**${r.title}**` : '';
    const url = r.url ? `<${r.url}>` : '';
    const snippet = r.snippet?.trim() ?? '';
    return [`${i + 1}. ${[title, url].filter(Boolean).join(' ')}`, snippet ? `   ${snippet}` : ''].filter(Boolean).join('\n');
  }).join('\n\n');
  return `${SEARCH_CONTEXT_PREFIX}\n[Web search results for "${query}"]\n\n${body}`;
}

interface StreamDelta { requestId: string; delta: string; done: boolean; }

export function ChatView() {
  const chatMessages = useAppStore((s) => s.chatMessages);
  const loadChatMessagesForCurrentSession = useAppStore((s) => s.loadChatMessagesForCurrentSession);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const sessions = useAppStore((s) => s.sessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFolderItems] = useState<string[]>([]);
  const [folderItemsMap] = useState<Record<string, any>>({});
  const selectedModel = useAppStore((s) => s.selectedModel);
  const councilModels = useAppStore((s) => s.councilModels);
  const broadcastMode = useAppStore((s) => s.broadcastMode);
  const [activeDocCompiler, setActiveDocCompiler] = useState<string | null>(null);
  const [compileTitle, setCompileTitle] = useState('');
  const [compileStatus, setCompileStatus] = useState<string | null>(null);
  const [webSearching, setWebSearching] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [showContextViewer, setShowContextViewer] = useState(false);
  const [showSaveToFolder, setShowSaveToFolder] = useState(false);
  const [savingToFolder, setSavingToFolder] = useState(false);

  const contextWindow = modelContextWindow(selectedModel);
  const activeMessages = chatMessages.filter((m) => !m.isExcluded && !m.isArchived && !m.isPruned);
  const contextTokens = activeMessages.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
  const tokenPct = Math.min(contextTokens / contextWindow, 1);
  const warnThreshold = 0.7;
  const pruneThreshold = 0.85;

  async function handleAutoPrune() {
    setPruning(true);
    const target = contextWindow * 0.5;
    let running = contextTokens;
    const sorted = [...activeMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const msg of sorted) {
      if (running <= target) break;
      await invoke('update_chat_message', { id: msg.id, input: { isPruned: true } });
      running -= msg.totalTokens || 0;
    }
    await loadChatMessagesForCurrentSession();
    setPruning(false);
  }

  useEffect(() => { loadChatMessagesForCurrentSession(); }, [currentSessionId, loadChatMessagesForCurrentSession]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, streamingContent, currentSessionId]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setShowSearch((v) => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const displayMessages = searchResults ?? chatMessages;

  const handleSend = useCallback(async (rawText: string) => {
    let userText = rawText;
    let searchContext = '';
    const searchMatch = rawText.match(/^\/search\s+(.+)/is);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      setWebSearching(true);
      try {
        const results = await webSearch(query, 5) as unknown as SearchResult[];
        searchContext = buildSearchContext(query, results);
      } catch { searchContext = `${SEARCH_CONTEXT_PREFIX} Web search failed for "${query}".`; }
      finally { setWebSearching(false); }
      userText = query;
    }

    const history = [...chatMessages]
      .filter((m) => !m.isExcluded && !m.isArchived && !m.isPruned)
      .flatMap((m) => {
        const content = m.systemPrompt?.startsWith(SEARCH_CONTEXT_PREFIX)
          ? `${m.systemPrompt}\n\n---\n\n${m.userMessage}`
          : m.userMessage;
        return [
          { role: 'user', content },
          { role: 'assistant', content: m.aiMessage },
        ];
      });
    const apiContent = searchContext ? `${searchContext}\n\n---\n\n${userText}` : userText;

    const isCouncil = councilModels.length > 0;
    const isBroadcast = broadcastMode;

    if (isBroadcast) {
      const allModels = broadcastModelIds();
      setStreamingContent(`Broadcasting to ${allModels.length} providers…`);
      try {
        const results = await Promise.allSettled(
          allModels.map((model) =>
            invoke<{ content: string; model: string; provider: string; inputTokens: number; outputTokens: number }>(
              'send_chat',
              { request: { messages: [...history, { role: 'user', content: apiContent }], model, systemPrompt: currentSession?.systemPrompt ?? null }, requestId: crypto.randomUUID() }
            )
          )
        );

        const alternatives: ChatMessageAlternative[] = results
          .map((r, i): ChatMessageAlternative | null =>
            r.status === 'fulfilled'
              ? { provider: r.value.provider, providerName: modelLabel(allModels[i]), modelId: r.value.model || allModels[i], content: r.value.content, tokens: (r.value.inputTokens ?? 0) + (r.value.outputTokens ?? 0), preferred: i === 0 }
              : null
          )
          .filter((a): a is ChatMessageAlternative => a !== null);

        if (alternatives.length === 0) throw new Error('All broadcast requests failed');
        const primary = alternatives[0];

        await invoke('create_chat_message', {
          input: { userMessage: userText, aiMessage: primary.content, userTokens: primary.tokens, aiTokens: primary.tokens, totalTokens: alternatives.reduce((sum, a) => sum + a.tokens, 0), model: primary.modelId, provider: primary.provider, systemPrompt: searchContext || null, alternatives: JSON.stringify(alternatives), userId: 'default-user', sessionId: currentSessionId },
        });
        setStreamingContent(null);
        await loadChatMessagesForCurrentSession();
      } catch (err) {
        console.error('Broadcast failed:', err);
        setStreamingContent(`Error: ${err}`);
        setTimeout(() => setStreamingContent(null), 5000);
      }
    } else if (isCouncil) {
      const allModels = [selectedModel, ...councilModels];
      setStreamingContent(`Gathering ${allModels.length} council responses…`);
      try {
        const results = await Promise.allSettled(
          allModels.map((model) =>
            invoke<{ content: string; model: string; provider: string; inputTokens: number; outputTokens: number }>(
              'send_chat',
              { request: { messages: [...history, { role: 'user', content: apiContent }], model, systemPrompt: currentSession?.systemPrompt ?? null }, requestId: crypto.randomUUID() }
            )
          )
        );

        const alternatives: ChatMessageAlternative[] = results
          .map((r, i): ChatMessageAlternative | null =>
            r.status === 'fulfilled'
              ? {
                  provider: r.value.provider,
                  providerName: modelLabel(allModels[i]),
                  modelId: r.value.model || allModels[i],
                  content: r.value.content,
                  tokens: (r.value.inputTokens ?? 0) + (r.value.outputTokens ?? 0),
                  preferred: i === 0,
                }
              : null
          )
          .filter((a): a is ChatMessageAlternative => a !== null);

        if (alternatives.length === 0) throw new Error('All council requests failed');

        const primary = alternatives.find((a) => a.preferred) ?? alternatives[0];

        await invoke('create_chat_message', {
          input: {
            userMessage: userText,
            aiMessage: primary.content,
            userTokens: primary.tokens,
            aiTokens: primary.tokens,
            totalTokens: alternatives.reduce((sum, a) => sum + a.tokens, 0),
            model: primary.modelId,
            provider: primary.provider,
            systemPrompt: searchContext || null,
            alternatives: JSON.stringify(alternatives),
            userId: 'default-user',
            sessionId: currentSessionId,
          },
        });
        setStreamingContent(null);
        await loadChatMessagesForCurrentSession();
      } catch (err) {
        console.error('Council send failed:', err);
        setStreamingContent(`Error: ${err}`);
        setTimeout(() => setStreamingContent(null), 5000);
      }
    } else {
      const requestId = crypto.randomUUID();
      setStreamingContent('');
      const unlisten = await listen<StreamDelta>('chat-stream', (event) => {
        const { requestId: rid, delta, done } = event.payload;
        if (rid !== requestId || done) return;
        setStreamingContent((prev) => (prev ?? '') + delta);
      });
      try {
        const response = await invoke<{
          content: string; model: string; provider: string;
          inputTokens: number; outputTokens: number;
        }>('send_chat', { request: { messages: [...history, { role: 'user', content: apiContent }], model: selectedModel, systemPrompt: currentSession?.systemPrompt ?? null }, requestId });

        await invoke('create_chat_message', {
          input: {
            userMessage: userText,
            aiMessage: response.content,
            userTokens: response.inputTokens || Math.ceil(apiContent.length / 4),
            aiTokens: response.outputTokens || Math.ceil(response.content.length / 4),
            totalTokens: (response.inputTokens || 0) + (response.outputTokens || 0),
            model: response.model,
            provider: response.provider,
            systemPrompt: searchContext || null,
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
    }
  }, [loadChatMessagesForCurrentSession, chatMessages, selectedModel, councilModels, broadcastMode, currentSessionId, currentSession]);

  async function handleSaveSessionToFolder(folderId: string) {
    if (!currentSessionId) return;
    setSavingToFolder(true);
    try {
      const msgs = chatMessages.filter((m) => !m.isExcluded && !m.isArchived);
      const text = msgs.map((m) => `User: ${m.userMessage}\n\nAssistant: ${m.aiMessage}`).join('\n\n---\n\n');
      const tokens = Math.ceil(text.length / 4);
      await invoke('create_folder_item', { input: { content: text, tokens, itemType: 'chat-export', folderId } });
      setShowSaveToFolder(false);
    } catch (err) { console.error(err); }
    finally { setSavingToFolder(false); }
  }

  async function handleDocCompile(compilerName: string) {
    try {
      const safeTitle = compileTitle || new Date().toLocaleDateString();
      const msgIds = displayMessages.filter((m) => !m.isExcluded && !m.isArchived).map((m) => m.id);
      const outputPath = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
      await invoke(compilerName, { messageIds: msgIds, model: selectedModel, title: safeTitle, outputPath });
      setCompileStatus('✓ Document created');
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
        {webSearching && (
          <div className="rounded-xl border border-blue-700/40 bg-blue-900/10 p-3 flex items-center gap-2">
            <span className="animate-spin text-blue-400 text-sm">⟳</span>
            <span className="text-sm text-blue-300">Searching the web…</span>
          </div>
        )}
        {streamingContent !== null && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
              <div className="flex-1 min-w-0">
                {streamingContent.startsWith('Gathering') || streamingContent.startsWith('Error') ? (
                  <p className="text-sm text-gray-400 italic">{streamingContent}</p>
                ) : (
                  <>
                    <MarkdownRenderer content={streamingContent} />
                    <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {showContextViewer && (
        <ContextWindowViewer messages={chatMessages} onClose={() => setShowContextViewer(false)} />
      )}
      <ContextBar selectedFolderItems={selectedFolderItems} folderItemsMap={folderItemsMap} onRemove={() => {}} />
      <div className="border-t border-slate-700/50">
        <div className="flex items-center gap-2 px-4 py-1.5">
          <button
            onClick={() => setShowContextViewer(true)}
            className="text-xs text-gray-500 hover:text-blue-400 bg-slate-700/40 hover:bg-slate-700 px-2 py-0.5 rounded transition flex-shrink-0"
            title="View context window"
          >
            Context
          </button>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSaveToFolder(!showSaveToFolder)}
              disabled={savingToFolder || folders.length === 0}
              className="text-xs text-gray-500 hover:text-green-400 bg-slate-700/40 hover:bg-slate-700 px-2 py-0.5 rounded transition disabled:opacity-40"
              title="Save session to folder"
            >
              {savingToFolder ? 'Saving…' : '→ Folder'}
            </button>
            {showSaveToFolder && folders.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 min-w-[180px] py-1">
                {folders.map((f) => (
                  <button key={f.id} onClick={() => handleSaveSessionToFolder(f.id)} className="w-full text-left px-3 py-1.5 text-xs text-blue-300 hover:bg-slate-600 transition truncate">{f.name}</button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600 flex-shrink-0">·</span>
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
      <TokenBar
        contextTokens={contextTokens}
        contextWindow={contextWindow}
        tokenPct={tokenPct}
        warnThreshold={warnThreshold}
        pruneThreshold={pruneThreshold}
        pruning={pruning}
        onPrune={handleAutoPrune}
      />
      <MessageInput onSend={handleSend} />
    </div>
  );
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function TokenBar({
  contextTokens, contextWindow, tokenPct, warnThreshold, pruneThreshold, pruning, onPrune,
}: {
  contextTokens: number; contextWindow: number; tokenPct: number;
  warnThreshold: number; pruneThreshold: number; pruning: boolean; onPrune: () => void;
}) {
  if (contextTokens === 0) return null;

  const barColor =
    tokenPct >= pruneThreshold ? 'bg-red-500' :
    tokenPct >= warnThreshold  ? 'bg-amber-400' :
                                  'bg-blue-500';
  const labelColor =
    tokenPct >= pruneThreshold ? 'text-red-400' :
    tokenPct >= warnThreshold  ? 'text-amber-400' :
                                  'text-gray-500';

  return (
    <div className="px-4 py-1 border-t border-slate-700/50">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.max(tokenPct * 100, 0.5)}%` }}
          />
        </div>
        <span className={`text-xs flex-shrink-0 tabular-nums ${labelColor}`}>
          {fmtTokens(contextTokens)} / {fmtTokens(contextWindow)}
        </span>
        {tokenPct >= pruneThreshold && (
          <button
            onClick={onPrune}
            disabled={pruning}
            className="text-xs text-red-300 hover:text-white bg-red-900/40 hover:bg-red-800/60 px-2 py-0.5 rounded transition disabled:opacity-50"
          >
            {pruning ? 'Pruning…' : 'Auto-prune'}
          </button>
        )}
      </div>
      {tokenPct >= pruneThreshold && (
        <p className="text-xs text-red-400 mt-0.5">Context window nearly full — prune old messages to continue.</p>
      )}
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
  const [activeAltIndex, setActiveAltIndex] = useState(0);
  const [synthesizing, setSynthesizing] = useState(false);
  const synthesisModel = useAppStore((s) => s.synthesisModel);

  const ts = new Date(message.createdAt);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const contextTokens = Math.ceil(message.userMessage.length / 4) + message.aiTokens;

  const alternatives: ChatMessageAlternative[] | null = (() => {
    if (!message.alternatives) return null;
    try { return JSON.parse(message.alternatives as string) as ChatMessageAlternative[]; }
    catch { return null; }
  })();

  const displayContent = alternatives ? alternatives[activeAltIndex]?.content ?? message.aiMessage : message.aiMessage;
  const displayModel = alternatives ? alternatives[activeAltIndex]?.modelId ?? message.model : message.model;

  async function handleCopy() {
    await navigator.clipboard.writeText(displayContent);
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
      await invoke('create_folder_item', { input: { content: displayContent, tokens: message.aiTokens, itemType: 'ai-response', folderId } });
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

  async function handleSynthesize(alts: ChatMessageAlternative[]) {
    if (synthesizing || alts.length < 2) return;
    setSynthesizing(true);
    const parts = alts.map((a) => `## ${a.providerName} (${a.modelId}):\n${a.content}`).join('\n\n');
    const prompt = `Original question: "${message.userMessage}"\n\nMultiple AI models responded:\n\n${parts}\n\nSynthesize these responses into a single comprehensive, well-structured answer.`;
    try {
      const resp = await invoke<{ content: string; model: string; provider: string; inputTokens: number; outputTokens: number }>(
        'send_chat',
        { request: { messages: [{ role: 'user', content: prompt }], model: synthesisModel, systemPrompt: 'You are a council synthesizer. Provide a clear, comprehensive synthesis capturing the best insights from each response.' }, requestId: crypto.randomUUID() }
      );
      const synthesisAlt: ChatMessageAlternative = {
        provider: resp.provider, providerName: '✦ Synthesis', modelId: resp.model || synthesisModel,
        content: resp.content, tokens: (resp.inputTokens ?? 0) + (resp.outputTokens ?? 0), preferred: false,
      };
      const updated = [...alts, synthesisAlt];
      await invoke('update_chat_message', { id: message.id, input: { alternatives: JSON.stringify(updated) } });
      await onRefresh();
      setActiveAltIndex(updated.length - 1);
    } catch (err) { console.error('Synthesis failed:', err); }
    finally { setSynthesizing(false); }
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
                  <span>★ Save as Exchange</span><span className="text-gray-400 text-xs">{showExchangePicker ? '▲' : '▶'}</span>
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

          {alternatives && alternatives.length > 1 && (
            <div className="flex items-center gap-0.5 mb-3 border-b border-slate-700/50 pb-2">
              {alternatives.map((alt, i) => (
                <button
                  key={alt.modelId + i}
                  onClick={() => setActiveAltIndex(i)}
                  className={`text-xs px-2.5 py-1 rounded-t transition ${
                    i === activeAltIndex
                      ? alt.providerName.startsWith('✦')
                        ? 'bg-amber-700/50 text-amber-200 font-medium'
                        : 'bg-purple-700/60 text-purple-200 font-medium'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-slate-700/50'
                  }`}
                >
                  {alt.providerName}
                </button>
              ))}
              {!alternatives.some((a) => a.providerName.startsWith('✦')) && (
                <button
                  onClick={() => handleSynthesize(alternatives)}
                  disabled={synthesizing}
                  className="ml-auto text-xs text-amber-400 hover:text-white bg-amber-900/30 hover:bg-amber-800/50 px-2 py-0.5 rounded transition disabled:opacity-50"
                >
                  {synthesizing ? 'Synthesizing…' : '✦ Synthesize'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
            <div className="flex-1 min-w-0"><MarkdownRenderer content={displayContent} /></div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-gray-600">{timeStr}</span>
            <span className="text-xs text-gray-600 bg-slate-700/50 px-1.5 py-0.5 rounded">{displayModel}</span>
            <span className="text-xs text-gray-600">~{contextTokens.toLocaleString()} tokens</span>
            {alternatives && alternatives.some((a) => a.providerName.startsWith('✦')) && <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">✦ synthesized</span>}
            {alternatives && !alternatives.some((a) => a.providerName.startsWith('✦')) && <span className="text-xs text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded">⚡ council</span>}
            {message.isPruned && <span className="text-xs text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">pruned</span>}
            {message.isExcluded && <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">excluded</span>}
            {message.isArchived && <span className="text-xs text-gray-500 bg-slate-700/50 px-1.5 py-0.5 rounded">archived</span>}
            {message.systemPrompt?.startsWith(SEARCH_CONTEXT_PREFIX) && (
              <span className="text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">🔍 web</span>
            )}
            {savedFolderId && <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">✓ saved</span>}
            {savedAsExchange && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">★ saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
