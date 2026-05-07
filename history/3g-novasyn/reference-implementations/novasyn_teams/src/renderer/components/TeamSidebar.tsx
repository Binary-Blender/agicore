import React, { useState } from 'react';
import { useTeamsStore } from '../store/teamsStore';
import type { Channel, Member } from '../../shared/types';

export function TeamSidebar() {
  const teams = useTeamsStore((s) => s.teams);
  const currentTeamId = useTeamsStore((s) => s.currentTeamId);
  const channels = useTeamsStore((s) => s.channels);
  const currentChannelId = useTeamsStore((s) => s.currentChannelId);
  const members = useTeamsStore((s) => s.members);
  const setCurrentChannel = useTeamsStore((s) => s.setCurrentChannel);
  const createChannel = useTeamsStore((s) => s.createChannel);
  const setShowMemberList = useTeamsStore((s) => s.setShowMemberList);
  const showMemberList = useTeamsStore((s) => s.showMemberList);

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [membersCollapsed, setMembersCollapsed] = useState(false);

  const currentTeam = teams.find((t) => t.id === currentTeamId);

  // Separate channels and DMs
  const regularChannels = channels.filter((c) => !c.isDirect);
  const dmChannels = channels.filter((c) => c.isDirect);

  // Separate online/offline members
  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  const handleCreateChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    const channel = await createChannel(name);
    if (channel) {
      setNewChannelName('');
      setShowNewChannel(false);
      setCurrentChannel(channel.id);
    }
  };

  const handleStartDM = async (member: Member) => {
    // Check if DM channel already exists
    const existing = dmChannels.find((c) => c.name === member.displayName || c.description === member.id);
    if (existing) {
      setCurrentChannel(existing.id);
      setShowNewDM(false);
      return;
    }
    const channel = await createChannel(member.displayName, member.id, true);
    if (channel) {
      setCurrentChannel(channel.id);
      setShowNewDM(false);
    }
  };

  const getDMDisplayName = (channel: Channel): string => {
    // For DMs, show the other member's name
    if (channel.name) return channel.name;
    return 'Direct Message';
  };

  const getMemberInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="w-[260px] bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-hidden">
      {/* Team header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-bold text-white truncate">
          {currentTeam?.name || 'No Team'}
        </h2>
        {currentTeam?.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{currentTeam.description}</p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== Channels Section ===== */}
        <div className="mt-2">
          <div className="flex items-center justify-between px-4 py-1.5 group">
            <button
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition"
            >
              <svg
                className={`w-3 h-3 transition-transform ${channelsCollapsed ? '' : 'rotate-90'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Channels
            </button>
            <button
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition"
              title="New channel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* New channel input */}
          {showNewChannel && (
            <div className="px-4 py-1.5">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">#</span>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateChannel();
                    if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName(''); }
                  }}
                  placeholder="channel-name"
                  autoFocus
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                  className="text-teal-400 hover:text-teal-300 disabled:text-gray-600 text-xs px-1"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Channel list */}
          {!channelsCollapsed && (
            <div className="px-2">
              {regularChannels.length === 0 ? (
                <div className="px-2 py-1 text-xs text-gray-600">No channels yet</div>
              ) : (
                regularChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={channel.id === currentChannelId}
                    onClick={() => setCurrentChannel(channel.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* ===== Direct Messages Section ===== */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-4 py-1.5 group">
            <button
              onClick={() => setDmsCollapsed(!dmsCollapsed)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition"
            >
              <svg
                className={`w-3 h-3 transition-transform ${dmsCollapsed ? '' : 'rotate-90'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Direct Messages
            </button>
            <button
              onClick={() => setShowNewDM(!showNewDM)}
              className="text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition"
              title="New DM"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* New DM member picker */}
          {showNewDM && (
            <div className="px-4 py-1.5">
              <div className="bg-slate-800 border border-slate-600 rounded p-2 space-y-1">
                <div className="text-xs text-gray-400 mb-1">Start a conversation with:</div>
                {members.filter((m) => !m.isSelf).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleStartDM(member)}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 transition text-left"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {getMemberInitial(member.displayName)}
                    </div>
                    <span className="text-xs text-gray-200 truncate">{member.displayName}</span>
                  </button>
                ))}
                {members.filter((m) => !m.isSelf).length === 0 && (
                  <div className="text-xs text-gray-500">No other members</div>
                )}
              </div>
            </div>
          )}

          {/* DM list */}
          {!dmsCollapsed && (
            <div className="px-2">
              {dmChannels.length === 0 ? (
                <div className="px-2 py-1 text-xs text-gray-600">No direct messages</div>
              ) : (
                dmChannels.map((channel) => {
                  const dmName = getDMDisplayName(channel);
                  const member = members.find((m) => m.id === channel.description || m.displayName === channel.name);
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setCurrentChannel(channel.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition ${
                        channel.id === currentChannelId
                          ? 'bg-teal-600/20 text-white'
                          : 'text-gray-400 hover:bg-slate-800 hover:text-gray-200'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: member?.avatarColor || '#6b7280' }}
                        >
                          {getMemberInitial(dmName)}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                            member?.isOnline ? 'bg-green-500' : 'bg-gray-500'
                          }`}
                        />
                      </div>
                      <span className="text-sm truncate">{dmName}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ===== Members Section ===== */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-4 py-1.5">
            <button
              onClick={() => setMembersCollapsed(!membersCollapsed)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition"
            >
              <svg
                className={`w-3 h-3 transition-transform ${membersCollapsed ? '' : 'rotate-90'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Members ({members.length})
            </button>
            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className="text-gray-500 hover:text-gray-200 transition"
              title="Toggle member list panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {!membersCollapsed && (
            <div className="px-2">
              {/* Online members */}
              {onlineMembers.length > 0 && (
                <div className="mb-1">
                  <div className="px-2 py-0.5 text-xs text-gray-500">
                    Online ({onlineMembers.length})
                  </div>
                  {onlineMembers.map((member) => (
                    <MemberItem key={member.id} member={member} onDM={() => handleStartDM(member)} />
                  ))}
                </div>
              )}

              {/* Offline members */}
              {offlineMembers.length > 0 && (
                <div>
                  <div className="px-2 py-0.5 text-xs text-gray-500">
                    Offline ({offlineMembers.length})
                  </div>
                  {offlineMembers.map((member) => (
                    <MemberItem key={member.id} member={member} onDM={() => handleStartDM(member)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: User profile */}
      <div className="px-3 py-2 border-t border-slate-700 flex items-center gap-2">
        {(() => {
          const self = members.find((m) => m.isSelf);
          return (
            <>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: self?.avatarColor || '#14b8a6' }}
              >
                {getMemberInitial(self?.displayName || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{self?.displayName || 'You'}</div>
                <div className="text-xs text-green-400">Online</div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// --- Sub-components ---

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition ${
        isActive
          ? 'bg-teal-600/20 text-white'
          : 'text-gray-400 hover:bg-slate-800 hover:text-gray-200'
      }`}
    >
      <span className="text-gray-500 text-sm flex-shrink-0">#</span>
      <span className={`text-sm truncate ${isActive ? 'font-semibold' : ''}`}>
        {channel.name}
      </span>
      {channel.isAiEnabled && (
        <span className="ml-auto text-xs text-teal-500 flex-shrink-0" title="AI enabled">
          AI
        </span>
      )}
    </button>
  );
}

function MemberItem({
  member,
  onDM,
}: {
  member: Member;
  onDM: () => void;
}) {
  const getMemberInitial = (name: string): string => name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onDM}
      className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 transition text-left group"
      title={`Message ${member.displayName}`}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: member.avatarColor }}
        >
          {getMemberInitial(member.displayName)}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
            member.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      </div>
      <span className={`text-sm truncate ${member.isOnline ? 'text-gray-200' : 'text-gray-500'}`}>
        {member.displayName}
      </span>
      {(member.role === 'owner' || member.role === 'admin') && (
        <span className="text-xs text-teal-500 ml-auto flex-shrink-0">
          {member.role}
        </span>
      )}
      {member.isSelf && (
        <span className="text-xs text-gray-600 ml-auto flex-shrink-0">you</span>
      )}
    </button>
  );
}
