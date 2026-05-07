import React, { useState, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { NovaSynExchangePacket } from '../../shared/types';

const CONTENT_TYPE_COLORS: Record<string, string> = {
  chapter: 'bg-blue-600/20 text-blue-300',
  selection: 'bg-purple-600/20 text-purple-300',
  encyclopedia: 'bg-green-600/20 text-green-300',
  image: 'bg-orange-600/20 text-orange-300',
  research: 'bg-cyan-600/20 text-cyan-300',
  prompt: 'bg-yellow-600/20 text-yellow-300',
};

export default function ExchangePanel() {
  const { setShowExchange, currentProject, currentChapter, encyclopediaEntries } = useWriterStore();
  const [tab, setTab] = useState<'send' | 'receive'>('send');
  const [packets, setPackets] = useState<NovaSynExchangePacket[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [expandedPacket, setExpandedPacket] = useState<string | null>(null);

  const loadPackets = useCallback(async () => {
    const result = await window.electronAPI.receiveFromExchange();
    setPackets(result);
  }, []);

  useEffect(() => { loadPackets(); }, [loadPackets]);

  const handleSendChapter = async () => {
    if (!currentChapter || !currentProject) return;
    setSending(true);
    setSendResult(null);
    try {
      // Extract text from TipTap JSON
      let text = '';
      try {
        const doc = JSON.parse(currentChapter.content);
        text = extractText(doc);
      } catch { text = currentChapter.content; }

      await window.electronAPI.sendToExchange({
        sourceApp: 'NovaSyn Writer',
        targetApp: null,
        contentType: 'chapter',
        title: `${currentProject.name} — ${currentChapter.title}`,
        content: text,
        metadata: { projectName: currentProject.name, chapterTitle: currentChapter.title, wordCount: currentChapter.wordCount },
      });
      setSendResult(`Sent chapter "${currentChapter.title}" to exchange`);
    } catch (err: any) {
      setSendResult(err.message || 'Failed to send');
    }
    setSending(false);
  };

  const handleSendSelection = async () => {
    const editor = (window as any).__tiptapEditor;
    if (!editor || !currentProject) return;
    const { from, to } = editor.state.selection;
    if (from === to) { setSendResult('No text selected'); return; }
    const text = editor.state.doc.textBetween(from, to);
    setSending(true);
    setSendResult(null);
    try {
      await window.electronAPI.sendToExchange({
        sourceApp: 'NovaSyn Writer',
        targetApp: null,
        contentType: 'selection',
        title: `Selection from ${currentProject.name}`,
        content: text,
        metadata: { projectName: currentProject.name, charCount: text.length },
      });
      setSendResult(`Sent ${text.length} characters to exchange`);
    } catch (err: any) {
      setSendResult(err.message || 'Failed to send');
    }
    setSending(false);
  };

  const handleSendEncyclopedia = async () => {
    if (!currentProject || encyclopediaEntries.length === 0) return;
    setSending(true);
    setSendResult(null);
    try {
      const content = encyclopediaEntries.map(e => `## ${e.name} [${e.category}]\n${e.content}`).join('\n\n---\n\n');
      await window.electronAPI.sendToExchange({
        sourceApp: 'NovaSyn Writer',
        targetApp: null,
        contentType: 'encyclopedia',
        title: `Encyclopedia from ${currentProject.name}`,
        content,
        metadata: { projectName: currentProject.name, entryCount: encyclopediaEntries.length },
      });
      setSendResult(`Sent ${encyclopediaEntries.length} encyclopedia entries to exchange`);
    } catch (err: any) {
      setSendResult(err.message || 'Failed to send');
    }
    setSending(false);
  };

  const handleImportPacket = async (packet: NovaSynExchangePacket) => {
    const editor = (window as any).__tiptapEditor;
    if (!editor) return;
    // Insert content into editor at cursor
    editor.chain().focus().insertContent(packet.content.replace(/\n/g, '<br/>')).run();
    setSendResult(`Imported "${packet.title}" into editor`);
  };

  const handleDeletePacket = async (packetId: string) => {
    await window.electronAPI.deleteExchangePacket(packetId);
    loadPackets();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[620px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-surface-200">NovaSyn Exchange</h2>
            <div className="flex gap-1">
              <button onClick={() => setTab('send')} className={`px-2 py-0.5 text-[10px] rounded ${tab === 'send' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'}`}>Send To</button>
              <button onClick={() => { setTab('receive'); loadPackets(); }} className={`px-2 py-0.5 text-[10px] rounded ${tab === 'receive' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'}`}>Receive From</button>
            </div>
          </div>
          <button onClick={() => setShowExchange(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* SEND TAB */}
          {tab === 'send' && (
            <>
              <p className="text-[10px] text-surface-600">Send content from NovaSyn Writer to other NovaSyn apps via the shared exchange directory.</p>

              <div className="space-y-2">
                <button
                  onClick={handleSendChapter}
                  disabled={sending || !currentChapter}
                  className="w-full p-3 text-left rounded border border-blue-500/30 bg-blue-600/5 hover:bg-blue-600/10 disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[9px] bg-blue-600/20 text-blue-300 rounded">Chapter</span>
                    <span className="text-xs text-surface-200">Send Current Chapter</span>
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">
                    {currentChapter ? `"${currentChapter.title}" (${currentChapter.wordCount}w)` : 'No chapter selected'}
                  </p>
                </button>

                <button
                  onClick={handleSendSelection}
                  disabled={sending || !currentChapter}
                  className="w-full p-3 text-left rounded border border-purple-500/30 bg-purple-600/5 hover:bg-purple-600/10 disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[9px] bg-purple-600/20 text-purple-300 rounded">Selection</span>
                    <span className="text-xs text-surface-200">Send Selected Text</span>
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">Sends the currently selected text in the editor</p>
                </button>

                <button
                  onClick={handleSendEncyclopedia}
                  disabled={sending || encyclopediaEntries.length === 0}
                  className="w-full p-3 text-left rounded border border-green-500/30 bg-green-600/5 hover:bg-green-600/10 disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[9px] bg-green-600/20 text-green-300 rounded">Encyclopedia</span>
                    <span className="text-xs text-surface-200">Send Encyclopedia</span>
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">{encyclopediaEntries.length} entries from current project</p>
                </button>
              </div>

              {sendResult && (
                <div className="p-2 bg-primary-600/10 border border-primary-500/30 rounded text-xs text-primary-300">
                  {sendResult}
                </div>
              )}
            </>
          )}

          {/* RECEIVE TAB */}
          {tab === 'receive' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-surface-600">Incoming content from other NovaSyn apps</p>
                <button onClick={loadPackets} className="px-2 py-0.5 text-[10px] bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 rounded">Refresh</button>
              </div>

              {packets.length === 0 ? (
                <div className="text-center py-8 text-xs text-surface-600">
                  No exchange packets found. Other NovaSyn apps can send content here.
                </div>
              ) : (
                packets.map(packet => (
                  <div key={packet.id} className="p-3 rounded border border-[var(--border)] bg-[var(--bg-page)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[9px] rounded ${CONTENT_TYPE_COLORS[packet.contentType] || 'bg-surface-600/20 text-surface-400'}`}>
                            {packet.contentType}
                          </span>
                          <span className="text-xs text-surface-200">{packet.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-surface-500">From: {packet.sourceApp}</span>
                          <span className="text-[10px] text-surface-600">{new Date(packet.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleImportPacket(packet)}
                          className="px-2 py-0.5 text-[10px] bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded"
                          title="Insert into editor"
                        >
                          Import
                        </button>
                        <button
                          onClick={() => setExpandedPacket(expandedPacket === packet.id ? null : packet.id)}
                          className="px-2 py-0.5 text-[10px] bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded"
                        >
                          {expandedPacket === packet.id ? 'Hide' : 'Preview'}
                        </button>
                        <button
                          onClick={() => handleDeletePacket(packet.id)}
                          className="px-2 py-0.5 text-[10px] bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded"
                          title="Delete packet"
                        >
                          x
                        </button>
                      </div>
                    </div>

                    {expandedPacket === packet.id && (
                      <div className="mt-2 p-2 bg-[var(--bg-panel)] rounded text-xs text-surface-300 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                        {packet.content.slice(0, 2000)}
                        {packet.content.length > 2000 && <span className="text-surface-600">... ({packet.content.length} total chars)</span>}
                      </div>
                    )}
                  </div>
                ))
              )}

              {sendResult && (
                <div className="p-2 bg-green-600/10 border border-green-500/30 rounded text-xs text-green-300">
                  {sendResult}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-between items-center shrink-0">
          <span className="text-[10px] text-surface-600">
            Exchange directory: %APPDATA%/NovaSyn/exchange/
          </span>
          <button onClick={() => setShowExchange(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractText(child)).join(node.type === 'paragraph' || node.type === 'heading' ? '\n' : '');
  }
  return '';
}
