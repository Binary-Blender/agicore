import React from 'react';
import { useWriterStore } from '../store/writerStore';

export default function DiscoveryPanel() {
  const {
    discoverySuggestions,
    discoveryLoading,
    discoverySurprise,
    discoveryFollowThread,
    discoverySession,
    discoveryMode,
    toggleDiscoveryMode,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    setFollowThread,
    setDiscoverySurprise,
    setShowDiscoveryLog,
  } = useWriterStore();

  if (!discoveryMode) return null;

  const acceptedCount = discoverySession?.suggestionsAccepted ?? 0;

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-xl z-40 flex flex-col max-h-[60vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-semibold text-primary-300">Discovery Mode</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleDiscoveryMode()}
            className="text-xs text-surface-500 hover:text-red-400 transition-colors"
            title="Turn off Discovery Mode"
          >
            Off
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Surprise/Temperature slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-surface-500">Surprise</label>
            <span className="text-xs text-surface-400">{discoverySurprise.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={discoverySurprise}
            onChange={(e) => setDiscoverySurprise(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2a2a4a] rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-[10px] text-surface-600">
            <span>Focused</span>
            <span>Wild</span>
          </div>
        </div>

        {/* Follow Thread */}
        <div>
          <input
            type="text"
            className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            placeholder="Tell AI a direction..."
            value={discoveryFollowThread}
            onChange={(e) => setFollowThread(e.target.value)}
          />
        </div>

        {/* Generate button */}
        <button
          onClick={generateSuggestions}
          disabled={discoveryLoading}
          className="w-full py-1.5 bg-primary-600/20 hover:bg-primary-600/30 disabled:bg-surface-700 disabled:text-surface-500 text-primary-300 text-xs rounded transition-colors"
        >
          {discoveryLoading ? 'Generating...' : 'Generate Suggestions'}
        </button>

        {/* Suggestions */}
        {discoverySuggestions.length > 0 && (
          <div className="space-y-2">
            {discoverySuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-2.5"
              >
                <div className="text-xs text-surface-200 leading-relaxed mb-2">
                  {suggestion.suggestionText}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => acceptSuggestion(suggestion.id, 'insert')}
                    className="px-2 py-0.5 text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded transition-colors"
                    title="Insert at cursor"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => acceptSuggestion(suggestion.id, 'modify')}
                    className="px-2 py-0.5 text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors"
                    title="Replace selection"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => acceptSuggestion(suggestion.id, 'new')}
                    className="px-2 py-0.5 text-[10px] bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded transition-colors"
                    title="Append as new paragraph"
                  >
                    New ¶
                  </button>
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="ml-auto px-1.5 py-0.5 text-[10px] text-surface-500 hover:text-red-400 transition-colors"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {discoveryLoading && discoverySuggestions.length === 0 && (
          <div className="text-center py-4">
            <div className="text-xs text-surface-500 animate-pulse">Thinking of possibilities...</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] shrink-0">
        <span className="text-[10px] text-surface-500">
          {acceptedCount} accepted this session
        </span>
        <button
          onClick={() => setShowDiscoveryLog(true)}
          className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
        >
          View Log
        </button>
      </div>
    </div>
  );
}
