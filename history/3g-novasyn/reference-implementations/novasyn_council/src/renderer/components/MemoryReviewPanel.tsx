import React from 'react';
import { useCouncilStore } from '../store/councilStore';

const TYPE_COLORS: Record<string, string> = {
  decision: 'bg-blue-600/30 text-blue-300',
  lesson: 'bg-green-600/30 text-green-300',
  fact: 'bg-cyan-600/30 text-cyan-300',
  preference: 'bg-purple-600/30 text-purple-300',
  insight: 'bg-orange-600/30 text-orange-300',
  correction: 'bg-red-600/30 text-red-300',
};

export default function MemoryReviewPanel() {
  const {
    extractedMemories,
    showMemoryReview,
    acceptExtractedMemory,
    dismissExtractedMemory,
    setShowMemoryReview,
  } = useCouncilStore();

  if (!showMemoryReview) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowMemoryReview(false)}>
      <div className="w-[560px] max-h-[70vh] flex flex-col bg-[#16213e] rounded-xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Extracted Memories</h2>
            <p className="text-[10px] text-surface-500 mt-0.5">
              Review and accept memories from this conversation
            </p>
          </div>
          <button
            onClick={() => setShowMemoryReview(false)}
            className="text-surface-500 hover:text-surface-300 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {extractedMemories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-surface-500">No memories to review</p>
              <p className="text-xs text-surface-600 mt-1">All memories have been processed</p>
            </div>
          ) : (
            extractedMemories.map((memory, index) => (
              <div
                key={index}
                className="bg-white/[0.03] rounded-lg border border-white/5 p-3"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${TYPE_COLORS[memory.type] || 'bg-surface-600/30 text-surface-300'}`}>
                      {memory.type}
                    </span>
                    <span className="text-[10px] text-surface-500">
                      importance: {(memory.importance * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <p className="text-sm text-surface-200 mb-2 leading-relaxed">{memory.content}</p>

                {memory.relevanceTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {memory.relevanceTags.map((tag, ti) => (
                      <span key={ti} className="px-1.5 py-0.5 text-[10px] bg-white/5 text-surface-400 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptExtractedMemory(memory)}
                    className="px-3 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/20 rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => dismissExtractedMemory(index)}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-surface-400 border border-white/5 rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {extractedMemories.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-[10px] text-surface-500">
              {extractedMemories.length} memor{extractedMemories.length === 1 ? 'y' : 'ies'} remaining
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMemoryReview(false)}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-surface-300 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  extractedMemories.forEach(m => acceptExtractedMemory(m));
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
