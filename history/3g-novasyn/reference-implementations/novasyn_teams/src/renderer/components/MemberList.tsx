import React from 'react';
import { useTeamsStore } from '../store/teamsStore';
import type { Member } from '../../shared/types';

export function MemberList() {
  const members = useTeamsStore((s) => s.members);
  const setShowMemberList = useTeamsStore((s) => s.setShowMemberList);
  const createChannel = useTeamsStore((s) => s.createChannel);
  const channels = useTeamsStore((s) => s.channels);
  const setCurrentChannel = useTeamsStore((s) => s.setCurrentChannel);

  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  const handleStartDM = async (member: Member) => {
    // Check if DM already exists
    const existing = channels.find(
      (c) => c.isDirect && (c.name === member.displayName || c.description === member.id)
    );
    if (existing) {
      setCurrentChannel(existing.id);
      return;
    }
    const channel = await createChannel(member.displayName, member.id, true);
    if (channel) {
      setCurrentChannel(channel.id);
    }
  };

  const formatLastSeen = (lastSeen?: string | null): string => {
    if (!lastSeen) return 'Never';
    const d = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="w-[300px] bg-slate-900/50 border-l border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Members</h3>
          <span className="text-xs text-gray-500">{members.length}</span>
        </div>
        <button
          onClick={() => setShowMemberList(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Close member list"
        >
          &times;
        </button>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Online */}
        {onlineMembers.length > 0 && (
          <div className="mb-3">
            <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Online ({onlineMembers.length})
            </div>
            {onlineMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onDM={() => handleStartDM(member)}
                formatLastSeen={formatLastSeen}
              />
            ))}
          </div>
        )}

        {/* Offline */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Offline ({offlineMembers.length})
            </div>
            {offlineMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onDM={() => handleStartDM(member)}
                formatLastSeen={formatLastSeen}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  onDM,
  formatLastSeen,
}: {
  member: Member;
  onDM: () => void;
  formatLastSeen: (lastSeen?: string | null) => string;
}) {
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onDM}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-800 transition text-left group"
      title={member.isSelf ? 'Your profile' : `Message ${member.displayName}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: member.avatarColor }}
        >
          {getInitial(member.displayName)}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
            member.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium truncate ${member.isOnline ? 'text-white' : 'text-gray-400'}`}>
            {member.displayName}
          </span>
          {member.isSelf && (
            <span className="text-xs text-gray-600">(you)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(member.role === 'owner' || member.role === 'admin') && (
            <span className={`text-xs px-1 py-0.5 rounded ${
              member.role === 'owner' ? 'bg-teal-600/20 text-teal-400' : 'bg-blue-600/20 text-blue-400'
            }`}>
              {member.role}
            </span>
          )}
          {!member.isOnline && member.lastSeen && (
            <span className="text-xs text-gray-500">
              Last seen {formatLastSeen(member.lastSeen)}
            </span>
          )}
        </div>
      </div>

      {/* DM icon on hover */}
      {!member.isSelf && (
        <svg
          className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )}
    </button>
  );
}
