import React, { useEffect, useState } from 'react';
import { useSocialStore } from '../store/socialStore';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Inbox from './Inbox';
import MessageDetail from './MessageDetail';
import SPCDashboard from './SPCDashboard';
import KnowledgeBase from './KnowledgeBase';
import Onboarding from './Onboarding';
import { VaultBrowser } from './VaultBrowser';
import { OrchestrationBuilder } from './OrchestrationBuilder';
import { OrchestrationRunner } from './OrchestrationRunner';
import type { CreateAccountInput, SocialSettings, Orchestration } from '../../shared/types';

// ─── Settings Panel ──────────────────────────────────────────────────────────

const API_KEY_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'google', label: 'Google' },
  { key: 'xai', label: 'xAI' },
];

const OAUTH_CREDENTIALS = [
  { platform: 'gmail', label: 'Gmail', fields: ['gmail_client_id', 'gmail_client_secret'] },
  { platform: 'linkedin', label: 'LinkedIn', fields: ['linkedin_client_id', 'linkedin_client_secret'] },
  { platform: 'youtube', label: 'YouTube', fields: ['youtube_client_id', 'youtube_client_secret'] },
  { platform: 'twitter', label: 'Twitter/X', fields: ['twitter_client_id', 'twitter_client_secret'] },
];

const RESPONSE_MODES = [
  { value: 'standard', label: 'Standard' },
  { value: 'agree-amplify', label: 'Agree & Amplify' },
  { value: 'educate', label: 'Educate' },
  { value: 'battle', label: 'High Stakes' },
];

const SettingsPanel: React.FC = () => {
  const settings = useSocialStore((s) => s.settings);
  const saveSettings = useSocialStore((s) => s.saveSettings);
  const apiKeys = useSocialStore((s) => s.apiKeys);
  const setApiKey = useSocialStore((s) => s.setApiKey);
  const models = useSocialStore((s) => s.models);

  const [localSettings, setLocalSettings] = useState<SocialSettings>(settings);
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [oauthCreds, setOauthCreds] = useState<Record<string, string>>({});
  const [showOauthFields, setShowOauthFields] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    // Populate OAuth credential fields from settings (they're stored as settings keys)
    const creds: Record<string, string> = {};
    for (const platform of OAUTH_CREDENTIALS) {
      for (const field of platform.fields) {
        if ((settings as any)[field]) creds[field] = (settings as any)[field];
      }
    }
    setOauthCreds(creds);
  }, [settings]);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const handleThemeToggle = () => {
    const newTheme = localSettings.theme === 'dark' ? 'light' : 'dark';
    setLocalSettings((prev) => ({ ...prev, theme: newTheme }));
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSave = async () => {
    // Save core settings + OAuth credentials together
    const allSettings = { ...localSettings, ...oauthCreds };
    await saveSettings(allSettings);
    // Save API keys
    for (const provider of API_KEY_PROVIDERS) {
      const newVal = localKeys[provider.key];
      if (newVal !== undefined && newVal !== apiKeys[provider.key]) {
        await setApiKey(provider.key, newVal);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  const formatFieldLabel = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace('Id', 'ID');
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--text-heading)] mb-6">Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Theme Toggle */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Appearance</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-primary)]">Theme</span>
            <button
              onClick={handleThemeToggle}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${localSettings.theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-400'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                  ${localSettings.theme === 'light' ? 'translate-x-6' : 'translate-x-0'}
                `}
              />
            </button>
            <span className="text-xs text-[var(--text-muted)] w-12">
              {localSettings.theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">API Keys</h2>
          <div className="space-y-3">
            {API_KEY_PROVIDERS.map((provider) => (
              <div key={provider.key}>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  {provider.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showKeys[provider.key] ? 'text' : 'password'}
                    value={
                      showKeys[provider.key]
                        ? localKeys[provider.key] || ''
                        : localKeys[provider.key]
                          ? maskKey(localKeys[provider.key])
                          : ''
                    }
                    onChange={(e) =>
                      setLocalKeys((prev) => ({ ...prev, [provider.key]: e.target.value }))
                    }
                    onFocus={() => setShowKeys((prev) => ({ ...prev, [provider.key]: true }))}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder={`${provider.label} API key`}
                  />
                  <button
                    onClick={() =>
                      setShowKeys((prev) => ({
                        ...prev,
                        [provider.key]: !prev[provider.key],
                      }))
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title={showKeys[provider.key] ? 'Hide' : 'Show'}
                  >
                    {showKeys[provider.key] ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OAuth Credentials */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">OAuth Credentials</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Required for platform connections. Get these from each platform's developer console.
          </p>
          <div className="space-y-4">
            {OAUTH_CREDENTIALS.map((platform) => (
              <div key={platform.platform}>
                <h3 className="text-xs font-medium text-[var(--text-primary)] mb-2">{platform.label}</h3>
                <div className="space-y-2">
                  {platform.fields.map((field) => (
                    <div key={field} className="flex items-center gap-2">
                      <input
                        type={showOauthFields[field] ? 'text' : 'password'}
                        value={
                          showOauthFields[field]
                            ? oauthCreds[field] || ''
                            : oauthCreds[field]
                              ? maskKey(oauthCreds[field])
                              : ''
                        }
                        onChange={(e) =>
                          setOauthCreds((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                        onFocus={() => setShowOauthFields((prev) => ({ ...prev, [field]: true }))}
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        placeholder={formatFieldLabel(field)}
                      />
                      <button
                        onClick={() =>
                          setShowOauthFields((prev) => ({
                            ...prev,
                            [field]: !prev[field],
                          }))
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title={showOauthFields[field] ? 'Hide' : 'Show'}
                      >
                        {showOauthFields[field] ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">AI Settings</h2>
          <div className="space-y-4">
            {/* Default model */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Default Model</label>
              <select
                value={localSettings.defaultModel || ''}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, defaultModel: e.target.value }))
                }
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-classify toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[var(--text-primary)]">Auto-classify messages</span>
                <p className="text-xs text-[var(--text-muted)]">
                  Automatically classify incoming messages with AI
                </p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, autoClassify: !prev.autoClassify }))
                }
                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${localSettings.autoClassify ? 'bg-indigo-600' : 'bg-gray-600'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                    ${localSettings.autoClassify ? 'translate-x-6' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[var(--text-primary)]">Desktop notifications</span>
                <p className="text-xs text-[var(--text-muted)]">
                  Show notifications when new messages arrive during sync
                </p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))
                }
                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${localSettings.notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-600'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                    ${localSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Default response mode */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Default Response Mode
              </label>
              <select
                value={localSettings.defaultResponseMode || 'standard'}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, defaultResponseMode: e.target.value }))
                }
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RESPONSE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-green-400 animate-pulse">Settings saved</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Accounts Panel ──────────────────────────────────────────────────────────

const CONNECT_PLATFORMS = [
  { value: 'gmail', label: 'Gmail', color: 'bg-red-600 hover:bg-red-700' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700 hover:bg-blue-800' },
  { value: 'youtube', label: 'YouTube', color: 'bg-red-500 hover:bg-red-600' },
  { value: 'twitter', label: 'Twitter/X', color: 'bg-sky-500 hover:bg-sky-600' },
];

const PLATFORM_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  twitter: 'Twitter/X',
  manual: 'Manual',
};

const AccountsPanel: React.FC = () => {
  const accounts = useSocialStore((s) => s.accounts);
  const syncStatuses = useSocialStore((s) => s.syncStatuses);
  const autoSyncEnabled = useSocialStore((s) => s.autoSyncEnabled);
  const loadAccounts = useSocialStore((s) => s.loadAccounts);
  const connectPlatform = useSocialStore((s) => s.connectPlatform);
  const disconnectAccount = useSocialStore((s) => s.disconnectAccount);
  const deleteAccount = useSocialStore((s) => s.deleteAccount);
  const syncAccountAction = useSocialStore((s) => s.syncAccount);
  const syncAllAction = useSocialStore((s) => s.syncAll);
  const setAutoSync = useSocialStore((s) => s.setAutoSync);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);
  const [syncInterval, setSyncInterval] = useState(5);

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    await connectPlatform(platform);
    setConnecting(null);
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    await syncAccountAction(accountId);
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    setSyncing('all');
    await syncAllAction();
    setSyncing(null);
  };

  const handleDisconnect = async (id: string) => {
    if (confirmAction?.id === id && confirmAction?.action === 'disconnect') {
      await disconnectAccount(id);
      setConfirmAction(null);
    } else {
      setConfirmAction({ id, action: 'disconnect' });
      setTimeout(() => setConfirmAction(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmAction?.id === id && confirmAction?.action === 'delete') {
      await deleteAccount(id);
      setConfirmAction(null);
    } else {
      setConfirmAction({ id, action: 'delete' });
      setTimeout(() => setConfirmAction(null), 3000);
    }
  };

  const getSyncStatus = (accountId: string) =>
    syncStatuses.find((s) => s.accountId === accountId);

  function formatLastSync(dateStr?: string | null): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Accounts</h1>
          <p className="text-sm text-[var(--text-muted)]">Connect platforms and manage sync</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncing !== null || accounts.filter((a) => a.isConnected).length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            {syncing === 'all' && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Sync All
          </button>
        </div>
      </div>

      {/* Connect Platform Buttons */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">Connect a Platform</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Configure OAuth credentials in Settings first, then click to connect via OAuth2.
        </p>
        <div className="flex flex-wrap gap-3">
          {CONNECT_PLATFORMS.map((platform) => (
            <button
              key={platform.value}
              onClick={() => handleConnect(platform.value)}
              disabled={connecting !== null}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${platform.color}`}
            >
              {connecting === platform.value && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {connecting === platform.value ? 'Connecting...' : `Connect ${platform.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Sync Toggle */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">Auto-Sync</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Automatically sync connected accounts on a schedule
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Every</span>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value, 10))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <button
              onClick={() =>
                autoSyncEnabled
                  ? setAutoSync(false)
                  : setAutoSync(true, syncInterval)
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoSyncEnabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  autoSyncEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg overflow-hidden">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No accounts yet. Connect a platform above to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Platform</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Account</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Last Sync</th>
                <th className="text-right text-xs font-semibold text-[var(--text-muted)] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {accounts.map((account) => {
                const status = getSyncStatus(account.id);
                const isSyncing = syncing === account.id || status?.isSyncing;

                return (
                  <tr key={account.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-primary)] font-medium">
                        {PLATFORM_LABELS[account.platform] || account.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm text-[var(--text-primary)]">
                          {account.accountName}
                        </span>
                        {account.accountHandle && (
                          <span className="text-xs text-[var(--text-muted)] ml-2 font-mono">
                            {account.accountHandle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            account.isConnected && account.isActive
                              ? 'text-green-400'
                              : account.isConnected
                                ? 'text-amber-400'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              account.isConnected && account.isActive
                                ? 'bg-green-400'
                                : account.isConnected
                                  ? 'bg-amber-400'
                                  : 'bg-gray-500'
                            }`}
                          />
                          {account.isConnected
                            ? account.isActive
                              ? 'Connected'
                              : 'Inactive'
                            : 'Disconnected'}
                        </span>
                        {status?.lastError && (
                          <span className="text-[10px] text-red-400 truncate max-w-[150px]">
                            {status.lastError}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatLastSync(account.lastSyncAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {account.isConnected && (
                          <button
                            onClick={() => handleSync(account.id)}
                            disabled={!!isSyncing}
                            className="px-2.5 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors inline-flex items-center gap-1.5"
                          >
                            {isSyncing && (
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {isSyncing ? 'Syncing' : 'Sync'}
                          </button>
                        )}
                        {account.isConnected ? (
                          <button
                            onClick={() => handleDisconnect(account.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                              confirmAction?.id === account.id && confirmAction?.action === 'disconnect'
                                ? 'bg-amber-600 text-white'
                                : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-400'
                            }`}
                          >
                            {confirmAction?.id === account.id && confirmAction?.action === 'disconnect'
                              ? 'Confirm?'
                              : 'Disconnect'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(account.platform)}
                            disabled={connecting !== null}
                            className="px-2.5 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
                          >
                            Reconnect
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(account.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            confirmAction?.id === account.id && confirmAction?.action === 'delete'
                              ? 'bg-red-600 text-white'
                              : 'text-[var(--text-muted)] hover:text-red-400'
                          }`}
                        >
                          {confirmAction?.id === account.id && confirmAction?.action === 'delete'
                            ? 'Confirm?'
                            : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── App Root ────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const currentView = useSocialStore((s) => s.currentView);
  const loadInitialData = useSocialStore((s) => s.loadInitialData);
  const settings = useSocialStore((s) => s.settings);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showOrchBuilder, setShowOrchBuilder] = useState(false);
  const [editingOrch, setEditingOrch] = useState<Orchestration | undefined>(undefined);
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([]);
  const [runningOrchId, setRunningOrchId] = useState<string | null>(null);
  const [runningOrchName, setRunningOrchName] = useState('');

  useEffect(() => {
    loadInitialData().then(() => {
      setInitialized(true);
    });
    window.electronAPI.orchList().then(setOrchestrations).catch(console.error);
  }, []);

  // Check for first launch after settings load
  useEffect(() => {
    if (initialized && !(settings as any).onboarding_complete) {
      setShowOnboarding(true);
    }
  }, [initialized, settings]);

  // Apply theme on settings load
  useEffect(() => {
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  if (showOnboarding) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page)]">
        <TitleBar />
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inbox':
        return <Inbox />;
      case 'message-detail':
        return <MessageDetail />;
      case 'accounts':
        return <AccountsPanel />;
      case 'spc':
        return <SPCDashboard />;
      case 'knowledge-base':
        return <KnowledgeBase />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page)]">
      <TitleBar onOpenVault={() => setShowVault(true)} onOpenOrchestrations={() => setShowOrchBuilder(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{renderView()}</main>
      </div>
      <VaultBrowser isOpen={showVault} onClose={() => setShowVault(false)} />
      {showOrchBuilder && (
        <OrchestrationBuilder
          orchestration={editingOrch}
          onClose={() => { setShowOrchBuilder(false); setEditingOrch(undefined); }}
          onSaved={(orch) => {
            setOrchestrations((prev) => {
              const idx = prev.findIndex((o) => o.id === orch.id);
              if (idx >= 0) { const updated = [...prev]; updated[idx] = orch; return updated; }
              return [orch, ...prev];
            });
          }}
          onRun={async (orchId) => {
            setShowOrchBuilder(false);
            setEditingOrch(undefined);
            const orch = orchestrations.find((o) => o.id === orchId);
            const run = await window.electronAPI.orchRun(orchId);
            setRunningOrchId(run.id);
            setRunningOrchName(orch?.name || 'Orchestration');
          }}
        />
      )}
      {runningOrchId && (
        <OrchestrationRunner
          runId={runningOrchId}
          orchestrationName={runningOrchName}
          onClose={() => setRunningOrchId(null)}
        />
      )}
    </div>
  );
};

export default App;
