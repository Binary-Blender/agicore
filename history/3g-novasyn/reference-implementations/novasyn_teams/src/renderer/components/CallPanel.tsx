import React, { useState, useEffect } from 'react';
import { useTeamsStore } from '../store/teamsStore';
import type { Call, Member } from '../../shared/types';

export function CallPanel() {
  const calls = useTeamsStore((s) => s.calls);
  const currentChannelId = useTeamsStore((s) => s.currentChannelId);
  const members = useTeamsStore((s) => s.members);
  const loadCallHistory = useTeamsStore((s) => s.loadCallHistory);

  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  useEffect(() => {
    if (currentChannelId) {
      loadCallHistory(currentChannelId);
    }
  }, [currentChannelId, loadCallHistory]);

  const getMemberName = (memberId: string): string => {
    const member = members.find((m) => m.id === memberId);
    return member?.displayName || 'Unknown';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'screen_share':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const parseActionItems = (items: string | string[]): string[] => {
    if (Array.isArray(items)) return items;
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-2">
      {calls.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <p className="text-sm text-gray-500">No call history for this channel</p>
          <p className="text-xs text-gray-600 mt-1">Call records will appear here once available</p>
        </div>
      ) : (
        calls.map((call) => {
          const isExpanded = expandedCallId === call.id;
          const actionItems = parseActionItems(call.actionItems || '[]');

          return (
            <div
              key={call.id}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Call summary row */}
              <button
                onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-700/50 transition"
              >
                {/* Type icon */}
                <div className="text-gray-400 flex-shrink-0">
                  {getCallTypeIcon(call.callType)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">
                      {getMemberName(call.startedBy)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {call.callType} call
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDate(call.startedAt)} &middot; {formatDuration(call.durationSeconds)}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  call.status === 'active'
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-slate-700 text-gray-400'
                }`}>
                  {call.status === 'active' ? 'Active' : 'Ended'}
                </span>

                {/* Expand arrow */}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-700">
                  {/* Transcript */}
                  {call.transcript && (
                    <div className="mt-3">
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Transcript</h4>
                      <div className="bg-slate-900 rounded p-2 text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {call.transcript}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {call.summary && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Summary</h4>
                      <div className="bg-slate-900 rounded p-2 text-xs text-gray-300">
                        {call.summary}
                      </div>
                    </div>
                  )}

                  {/* Action items */}
                  {actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Action Items</h4>
                      <ul className="space-y-1">
                        {actionItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* View in Vault button */}
                  <button
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                    onClick={() => {
                      // Placeholder: would open vault with call record
                      console.log('View in vault:', call.id);
                    }}
                  >
                    View in Vault
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
