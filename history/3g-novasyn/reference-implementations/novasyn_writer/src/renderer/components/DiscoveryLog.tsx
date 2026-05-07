import React, { useEffect, useState } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function DiscoveryLog() {
  const {
    discoverySession,
    discoverySessions,
    discoveryMode,
    setShowDiscoveryLog,
    loadDiscoverySessions,
  } = useWriterStore();

  const [convertedText, setConvertedText] = useState<string | null>(null);

  useEffect(() => {
    loadDiscoverySessions();
  }, []);

  const handleConvert = async (sessionId: string) => {
    try {
      const result = await window.electronAPI.convertDiscovery(sessionId);
      if (result.suggestions.length > 0) {
        setConvertedText(result.suggestions.join('\n\n---\n\n'));
      } else {
        setConvertedText('No accepted suggestions in this session.');
      }
    } catch {
      setConvertedText('Failed to export suggestions.');
    }
  };

  const handleCopy = () => {
    if (convertedText) {
      navigator.clipboard.writeText(convertedText);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[540px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Discovery Log</h2>
            <p className="text-xs text-surface-500 mt-0.5">Session history and accepted suggestions</p>
          </div>
          <button
            onClick={() => setShowDiscoveryLog(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Session */}
          {discoveryMode && discoverySession && (
            <div className="bg-[var(--bg-page)] rounded border border-primary-500/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-primary-300">Active Session</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-surface-500">Started:</span>{' '}
                  <span className="text-surface-300">{formatDate(discoverySession.startedAt)}</span>
                </div>
                <div>
                  <span className="text-surface-500">Generated:</span>{' '}
                  <span className="text-surface-300">{discoverySession.suggestionsGenerated}</span>
                </div>
                <div>
                  <span className="text-surface-500">Accepted:</span>{' '}
                  <span className="text-surface-300">{discoverySession.suggestionsAccepted}</span>
                </div>
                {discoverySession.followThread && (
                  <div className="col-span-2">
                    <span className="text-surface-500">Thread:</span>{' '}
                    <span className="text-surface-300 italic">{discoverySession.followThread}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {discoverySessions.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-surface-400">Past Sessions</h3>
              {discoverySessions
                .filter((s) => s.endedAt)
                .map((session) => (
                  <div
                    key={session.id}
                    className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 hover:border-[#3a3a5a] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-surface-300">{formatDate(session.startedAt)}</span>
                      <button
                        onClick={() => handleConvert(session.id)}
                        className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Export
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-surface-400">
                        {session.suggestionsGenerated} generated
                      </span>
                      <span className="text-green-400/80">
                        {session.suggestionsAccepted} accepted
                      </span>
                      {session.followThread && (
                        <span className="text-surface-500 italic truncate flex-1">
                          "{session.followThread}"
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-surface-500">
              No discovery sessions yet. Enable Discovery Mode to start exploring.
            </div>
          )}

          {/* Converted output */}
          {convertedText !== null && (
            <div className="bg-[var(--bg-page)] rounded border border-accent-500/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-accent-300">Exported Suggestions</span>
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Copy
                </button>
              </div>
              <div className="text-xs text-surface-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {convertedText}
              </div>
              <button
                onClick={() => setConvertedText(null)}
                className="mt-2 text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
