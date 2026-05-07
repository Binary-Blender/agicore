import React, { useState, useEffect, useCallback } from 'react';
import type { InlineComment } from '../../shared/types';

interface CommentsPanelProps {
  chapterId: string;
  onClose: () => void;
}

export default function CommentsPanel({ chapterId, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [newText, setNewText] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const loadComments = useCallback(async () => {
    const result = await window.electronAPI.getComments(chapterId);
    setComments(result);
  }, [chapterId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleAdd = async () => {
    const editor = (window as any).__tiptapEditor;
    if (!editor || !newText.trim()) return;
    const { from, to } = editor.state.selection;
    if (from === to) return; // Need selected text

    await window.electronAPI.createComment({
      chapterId,
      fromPos: from,
      toPos: to,
      text: newText.trim(),
      author: 'Author',
    });
    setNewText('');
    loadComments();
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    await window.electronAPI.updateComment(id, { resolved });
    loadComments();
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteComment(id);
    loadComments();
  };

  const handleGoTo = (comment: InlineComment) => {
    const editor = (window as any).__tiptapEditor;
    if (!editor) return;
    try {
      const docSize = editor.state.doc.content.size;
      const from = Math.min(comment.fromPos, docSize);
      const to = Math.min(comment.toPos, docSize);
      editor.chain().focus().setTextSelection({ from, to }).run();
    } catch { /* position may be invalid after edits */ }
  };

  const filtered = comments.filter(c => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const openCount = comments.filter(c => !c.resolved).length;

  return (
    <div className="w-64 bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="p-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-200">Comments</span>
          {openCount > 0 && (
            <span className="text-[10px] bg-primary-600/30 text-primary-300 px-1.5 rounded">{openCount}</span>
          )}
        </div>
        <button onClick={onClose} className="text-surface-500 hover:text-surface-300 text-xs">x</button>
      </div>

      {/* Filter */}
      <div className="flex p-1.5 gap-1 border-b border-[var(--border)]">
        {(['all', 'open', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-0.5 text-[10px] rounded transition-colors ${
              filter === f ? 'bg-primary-600/20 text-primary-300' : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Add comment */}
      <div className="p-2 border-b border-[var(--border)]">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Select text, then add comment..."
          className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-14"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="mt-1 w-full px-2 py-1 text-xs bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 rounded transition-colors disabled:opacity-40"
        >
          Add Comment
        </button>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-3 text-xs text-surface-600 text-center">No comments</div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className={`p-2 border-b border-[var(--border)] group cursor-pointer hover:bg-white/5 ${c.resolved ? 'opacity-50' : ''}`}
              onClick={() => handleGoTo(c)}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-surface-300 flex-1">{c.text}</p>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResolve(c.id, !c.resolved); }}
                    className={`text-[10px] ${c.resolved ? 'text-yellow-400' : 'text-green-400'} hover:opacity-80`}
                    title={c.resolved ? 'Reopen' : 'Resolve'}
                  >
                    {c.resolved ? '↺' : '✓'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="text-[10px] text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    x
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-surface-600">{c.author}</span>
                <span className="text-[10px] text-surface-600">{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.resolved && <span className="text-[10px] text-green-500">Resolved</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
