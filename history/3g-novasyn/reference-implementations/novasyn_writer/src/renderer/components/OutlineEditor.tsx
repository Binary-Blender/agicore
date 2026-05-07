import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function OutlineEditor() {
  const {
    currentChapter,
    outline,
    setShowOutlineEditor,
    saveOutline,
  } = useWriterStore();

  const [beats, setBeats] = useState<string[]>([]);
  const [newBeat, setNewBeat] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (outline?.beats) {
      try {
        setBeats(JSON.parse(outline.beats));
      } catch {
        setBeats([]);
      }
    } else {
      setBeats([]);
    }
  }, [outline]);

  const handleAddBeat = () => {
    if (!newBeat.trim()) return;
    const updated = [...beats, newBeat.trim()];
    setBeats(updated);
    setNewBeat('');
    saveOutline(updated);
  };

  const handleDeleteBeat = (index: number) => {
    const updated = beats.filter((_, i) => i !== index);
    setBeats(updated);
    saveOutline(updated);
  };

  const handleEditSubmit = (index: number) => {
    if (!editValue.trim()) return;
    const updated = [...beats];
    updated[index] = editValue.trim();
    setBeats(updated);
    setEditingIndex(null);
    saveOutline(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...beats];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setBeats(updated);
    saveOutline(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === beats.length - 1) return;
    const updated = [...beats];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setBeats(updated);
    saveOutline(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">
            Chapter Outline{currentChapter ? `: ${currentChapter.title}` : ''}
          </h2>
          <button
            onClick={() => setShowOutlineEditor(false)}
            className="text-surface-500 hover:text-surface-300"
          >
            x
          </button>
        </div>

        {/* Beats list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {beats.length === 0 && (
            <p className="text-xs text-surface-600 text-center py-4">
              No beats yet. Add story beats to outline this chapter.
            </p>
          )}

          {beats.map((beat, index) => (
            <div
              key={index}
              className="flex items-start gap-2 group bg-[var(--bg-page)] rounded px-3 py-2"
            >
              <span className="text-xs text-surface-600 mt-0.5 shrink-0 w-5">{index + 1}.</span>

              {editingIndex === index ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-surface-200 text-sm focus:outline-none border-b border-primary-500"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditSubmit(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSubmit(index);
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                />
              ) : (
                <span
                  className="flex-1 text-sm text-surface-300 cursor-pointer"
                  onDoubleClick={() => {
                    setEditingIndex(index);
                    setEditValue(beat);
                  }}
                >
                  {beat}
                </span>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveUp(index)}
                  className="text-surface-500 hover:text-surface-300 text-xs px-1"
                  disabled={index === 0}
                >
                  ^
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  className="text-surface-500 hover:text-surface-300 text-xs px-1"
                  disabled={index === beats.length - 1}
                >
                  v
                </button>
                <button
                  onClick={() => handleDeleteBeat(index)}
                  className="text-red-400 hover:text-red-300 text-xs px-1"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add beat input */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
              placeholder="Add a story beat..."
              value={newBeat}
              onChange={(e) => setNewBeat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddBeat();
              }}
            />
            <button
              onClick={handleAddBeat}
              disabled={!newBeat.trim()}
              className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white rounded transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
