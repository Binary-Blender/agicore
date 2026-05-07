import React from 'react';
import { useTeamsStore } from '../store/teamsStore';

export function ChannelHeader() {
  const channels = useTeamsStore((s) => s.channels);
  const currentChannelId = useTeamsStore((s) => s.currentChannelId);
  const members = useTeamsStore((s) => s.members);
  const showThreadPanel = useTeamsStore((s) => s.showThreadPanel);
  const showMemberList = useTeamsStore((s) => s.showMemberList);
  const setShowThreadPanel = useTeamsStore((s) => s.setShowThreadPanel);
  const setShowMemberList = useTeamsStore((s) => s.setShowMemberList);

  const currentChannel = channels.find((c) => c.id === currentChannelId);
  if (!currentChannel) return null;

  const channelPrefix = currentChannel.isDirect ? '' : '# ';

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700 bg-slate-800/80">
      {/* Left: Channel name + description */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-bold text-white truncate">
          {channelPrefix}{currentChannel.name}
        </h2>
        {currentChannel.description && !currentChannel.isDirect && (
          <>
            <div className="w-px h-4 bg-slate-600" />
            <span className="text-xs text-gray-400 truncate">{currentChannel.description}</span>
          </>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Member count */}
        <span className="text-xs text-gray-400 mr-2">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>

        {/* AI Summarize */}
        <button
          onClick={async () => {
            try {
              await window.electronAPI.aiSummarizeChannel(currentChannelId!);
            } catch (err) {
              console.error('Summarize failed:', err);
            }
          }}
          className="px-2 py-1 text-xs text-gray-400 hover:text-teal-400 hover:bg-slate-700 rounded transition"
          title="AI Summarize"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Thread panel toggle */}
        <button
          onClick={() => setShowThreadPanel(!showThreadPanel)}
          className={`px-2 py-1 text-xs rounded transition ${
            showThreadPanel
              ? 'text-teal-400 bg-teal-600/20'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
          title="Toggle thread panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {/* Member list toggle */}
        <button
          onClick={() => setShowMemberList(!showMemberList)}
          className={`px-2 py-1 text-xs rounded transition ${
            showMemberList
              ? 'text-teal-400 bg-teal-600/20'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
          title="Toggle member list"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Call button (placeholder) */}
        <button
          className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Call (coming soon)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
