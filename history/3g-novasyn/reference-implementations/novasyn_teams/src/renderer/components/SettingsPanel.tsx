import React, { useState, useEffect } from 'react';
import { useTeamsStore } from '../store/teamsStore';

const AVATAR_COLORS = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#ef4444', '#eab308', '#06b6d4', '#6366f1',
  '#a855f7', '#f43f5e', '#10b981', '#0ea5e9', '#d946ef',
];

export function SettingsPanel() {
  const setShowSettings = useTeamsStore((s) => s.setShowSettings);
  const teams = useTeamsStore((s) => s.teams);
  const currentTeamId = useTeamsStore((s) => s.currentTeamId);
  const updateTeam = useTeamsStore((s) => s.updateTeam);
  const displayName = useTeamsStore((s) => s.displayName);
  const avatarColor = useTeamsStore((s) => s.avatarColor);
  const setDisplayName = useTeamsStore((s) => s.setDisplayName);
  const setAvatarColor = useTeamsStore((s) => s.setAvatarColor);
  const members = useTeamsStore((s) => s.members);
  const apiKeys = useTeamsStore((s) => s.apiKeys);

  const [tab, setTab] = useState<'profile' | 'team' | 'keys' | 'ai'>('profile');
  const [editDisplayName, setEditDisplayName] = useState(displayName);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [debugLog, setDebugLog] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const selfMember = members.find((m) => m.isSelf);
  const isOwnerOrAdmin = selfMember?.role === 'owner' || selfMember?.role === 'admin';

  useEffect(() => {
    if (currentTeam) {
      setEditTeamName(currentTeam.name);
      setEditTeamDesc(currentTeam.description || '');
    }
  }, [currentTeam]);

  useEffect(() => {
    window.electronAPI.getSettings().then((s: any) => {
      if (s?.debugLog !== undefined) setDebugLog(s.debugLog);
    });
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await window.electronAPI.updateSettings({
        displayName: editDisplayName.trim(),
        avatarColor,
      });
      setDisplayName(editDisplayName.trim());
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
    setSaving(false);
  };

  const handleSaveTeam = async () => {
    if (!currentTeamId) return;
    setSaving(true);
    try {
      await updateTeam(currentTeamId, {
        name: editTeamName.trim(),
        description: editTeamDesc.trim(),
      });
    } catch (err) {
      console.error('Failed to save team settings:', err);
    }
    setSaving(false);
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setShowSettings(false);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'team' as const, label: 'Team' },
    { id: 'keys' as const, label: 'API Keys' },
    { id: 'ai' as const, label: 'AI Settings' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleBackdrop}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[600px] h-[480px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        {/* Tabs + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab sidebar */}
          <div className="w-[160px] bg-slate-900/50 border-r border-slate-700 py-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-4 py-2 text-sm transition ${
                  tab === t.id
                    ? 'text-white bg-teal-600/20 border-r-2 border-teal-400'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* ===== Profile Tab ===== */}
            {tab === 'profile' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Profile</h3>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Avatar Color</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setAvatarColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          avatarColor === color ? 'border-white scale-110' : 'border-transparent hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-3 p-3 bg-slate-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">Preview</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {(editDisplayName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white font-medium">{editDisplayName || 'Your Name'}</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}

            {/* ===== Team Tab ===== */}
            {tab === 'team' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Team Settings</h3>

                {!currentTeam ? (
                  <div className="text-sm text-gray-500">No team configured.</div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Team Name</label>
                      <input
                        type="text"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        disabled={!isOwnerOrAdmin}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                      <textarea
                        value={editTeamDesc}
                        onChange={(e) => setEditTeamDesc(e.target.value)}
                        disabled={!isOwnerOrAdmin}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 resize-none disabled:opacity-50"
                      />
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Team ID (share to invite members)</div>
                      <div className="text-sm text-gray-200 font-mono bg-slate-800 rounded px-2 py-1 select-all">
                        {currentTeam.id}
                      </div>
                    </div>

                    {isOwnerOrAdmin && (
                      <button
                        onClick={handleSaveTeam}
                        disabled={saving}
                        className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Team Settings'}
                      </button>
                    )}

                    {!isOwnerOrAdmin && (
                      <div className="text-xs text-gray-500 italic">
                        Only owners and admins can edit team settings.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===== API Keys Tab ===== */}
            {tab === 'keys' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">API Keys</h3>
                <p className="text-xs text-gray-400 mb-3">
                  API keys are managed through the shared NovaSyn key store and available across all NovaSyn apps.
                </p>

                {['anthropic', 'openai', 'google', 'xai', 'babyai'].map((provider) => (
                  <div key={provider} className="flex items-center justify-between py-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white capitalize">{provider}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      apiKeys[provider]
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-slate-700 text-gray-500'
                    }`}>
                      {apiKeys[provider] ? 'Configured' : 'Not set'}
                    </span>
                  </div>
                ))}

                <p className="text-xs text-gray-500 mt-3">
                  To add or update keys, edit the shared key store at %APPDATA%\NovaSyn\api-keys.json
                </p>
              </div>
            )}

            {/* ===== AI Settings Tab ===== */}
            {tab === 'ai' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Settings</h3>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="accent-teal-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-sm text-white">Enable BabyAI in channels</div>
                    <div className="text-xs text-gray-400">
                      BabyAI can respond when mentioned with @BabyAI in AI-enabled channels
                    </div>
                  </div>
                </label>

                <div className="p-3 bg-slate-900 rounded-lg mt-3">
                  <div className="text-xs text-gray-400 mb-2">AI Features</div>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      Channel summarization (AI generates a summary of recent messages)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      @BabyAI mentions (ask questions directly in channels)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      Draft responses (AI helps draft replies)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                      Call transcription (coming soon)
                    </li>
                  </ul>
                </div>

                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Debug</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugLog}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setDebugLog(val);
                        await window.electronAPI.saveSettings({ debugLog: val });
                      }}
                      className="accent-teal-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-sm text-white">Enable debug logging</div>
                      <div className="text-xs text-gray-400">
                        Writes a debug.log file to Documents/NovaSyn Teams
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
