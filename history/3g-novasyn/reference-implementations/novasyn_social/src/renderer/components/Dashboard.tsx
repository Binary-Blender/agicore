import React, { useEffect, useState } from 'react';
import { useSocialStore } from '../store/socialStore';
import type { CreateMessageInput } from '../../shared/types';

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  linkedin_dm: 'bg-blue-700',
  linkedin_comment: 'bg-blue-700',
  youtube_comment: 'bg-red-500',
  twitter_dm: 'bg-sky-500',
  manual: 'bg-gray-500',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin_dm: 'LinkedIn DM',
  linkedin_comment: 'LinkedIn Comment',
  youtube_comment: 'YouTube',
  twitter_dm: 'Twitter',
  manual: 'Manual',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function priorityColor(score: number): string {
  if (score >= 75) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

const Dashboard: React.FC = () => {
  const messages = useSocialStore((s) => s.messages);
  const inboxStats = useSocialStore((s) => s.inboxStats);
  const loadInboxStats = useSocialStore((s) => s.loadInboxStats);
  const loadMessages = useSocialStore((s) => s.loadMessages);
  const selectMessage = useSocialStore((s) => s.selectMessage);
  const setCurrentView = useSocialStore((s) => s.setCurrentView);
  const createMessage = useSocialStore((s) => s.createMessage);
  const exportMessagesCsv = useSocialStore((s) => s.exportMessagesCsv);
  const exportSpcJson = useSocialStore((s) => s.exportSpcJson);
  const kbEntries = useSocialStore((s) => s.kbEntries);

  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState<CreateMessageInput>({
    channelType: 'manual',
    senderName: '',
    senderHandle: '',
    subject: '',
    body: '',
  });
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!inboxStats) loadInboxStats();
    if (messages.length === 0) loadMessages();
  }, []);

  // Compute channel breakdown
  const channelCounts: Record<string, number> = {};
  messages.forEach((m) => {
    channelCounts[m.channelType] = (channelCounts[m.channelType] || 0) + 1;
  });

  const activeChannels = Object.keys(channelCounts).length;

  // Top 10 high-priority messages (sorted by priority desc, unread first)
  const highPriorityMessages = [...messages]
    .sort((a, b) => {
      const priDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      if (priDiff !== 0) return priDiff;
      if (a.isRead === b.isRead) return 0;
      return a.isRead ? 1 : -1;
    })
    .slice(0, 10);

  const handleOpenMessage = (id: string) => {
    selectMessage(id);
    setCurrentView('message-detail');
  };

  const handleCompose = async () => {
    if (!composeForm.body.trim()) return;
    await createMessage(composeForm);
    setShowCompose(false);
    setComposeForm({ channelType: 'manual', senderName: '', senderHandle: '', subject: '', body: '' });
  };

  const handleExportMessages = async () => {
    const path = await exportMessagesCsv();
    if (path) {
      setExportStatus('Messages exported');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleExportSpc = async () => {
    const path = await exportSpcJson();
    if (path) {
      setExportStatus('SPC report exported');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const stats = [
    {
      label: 'Total Messages',
      value: inboxStats?.totalMessages ?? 0,
      color: 'text-indigo-400',
    },
    {
      label: 'Unread',
      value: inboxStats?.unreadCount ?? 0,
      color: (inboxStats?.unreadCount ?? 0) > 0 ? 'text-red-400' : 'text-[var(--text-muted)]',
    },
    {
      label: 'High Priority',
      value: inboxStats?.byPriority?.high ?? 0,
      color: 'text-amber-400',
    },
    {
      label: 'KB Entries',
      value: kbEntries.length,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-heading)]">Dashboard</h1>
        <div className="flex items-center gap-2">
          {exportStatus && (
            <span className="text-sm text-green-400 animate-pulse">{exportStatus}</span>
          )}
          <button
            onClick={handleExportMessages}
            className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg text-xs font-medium transition-colors"
          >
            Export Messages CSV
          </button>
          <button
            onClick={handleExportSpc}
            className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg text-xs font-medium transition-colors"
          >
            Export SPC JSON
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4"
          >
            <p className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Channel Breakdown */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Channel Breakdown</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(channelCounts).map(([channel, count]) => (
            <div key={channel} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[channel] || 'bg-gray-500'}`} />
              <span className="text-sm text-[var(--text-primary)]">
                {CHANNEL_LABELS[channel] || channel}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">{count}</span>
            </div>
          ))}
          {Object.keys(channelCounts).length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No messages yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <button
          onClick={() => setShowCompose(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Compose Message
        </button>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-4">Compose Message</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Channel</label>
                <select
                  value={composeForm.channelType}
                  onChange={(e) => setComposeForm({ ...composeForm, channelType: e.target.value as any })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="manual">Manual</option>
                  <option value="email">Email</option>
                  <option value="linkedin_dm">LinkedIn DM</option>
                  <option value="linkedin_comment">LinkedIn Comment</option>
                  <option value="youtube_comment">YouTube</option>
                  <option value="twitter_dm">Twitter</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={composeForm.senderName || ''}
                    onChange={(e) => setComposeForm({ ...composeForm, senderName: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Sender Handle</label>
                  <input
                    type="text"
                    value={composeForm.senderHandle || ''}
                    onChange={(e) => setComposeForm({ ...composeForm, senderHandle: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="@johndoe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject || ''}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Message subject"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Body</label>
                <textarea
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  rows={4}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Message body..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompose}
                disabled={!composeForm.body.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent High-Priority Messages */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">
            Recent High-Priority Messages
          </h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {highPriorityMessages.length === 0 && (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              No messages to display
            </div>
          )}
          {highPriorityMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleOpenMessage(msg.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {msg.senderName || msg.senderHandle || 'Unknown'}
                  </span>
                  <span
                    className={`
                      inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
                      ${CHANNEL_COLORS[msg.channelType] || 'bg-gray-500'} text-white
                    `}
                  >
                    {CHANNEL_LABELS[msg.channelType] || msg.channelType}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] truncate">
                  {msg.subject || msg.body?.slice(0, 100) || 'No content'}
                </p>
              </div>

              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold
                  ${priorityColor(msg.priorityScore ?? 0)}
                `}
              >
                {msg.priorityScore ?? 0}
              </span>

              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {msg.createdAt ? timeAgo(msg.createdAt) : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
