// @agicore-protected — Identity + Feed UI
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Fingerprint, Rss, RefreshCw, Copy, CheckCircle, Globe, Lock, User, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IdentityInfo {
  name: string;
  description: string;
  did: string;
  signingKeyType: string;
  domains: string[];
  discoverable: boolean;
  portable: boolean;
  profile: Record<string, string>;
  createdAt: string;
}

interface FeedInfo {
  name: string;
  title: string;
  description: string;
  identity: string;
  subscribe: string;
  syndicate: boolean;
  maxItems: number;
  entryCount: number;
  lastUpdated?: string;
}

interface FeedEntry {
  id: string;
  title: string;
  content: string;
  authorDid: string;
  signature: string;
  publishedAt: string;
  source: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(console.error);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

// ─── Identity Panel ───────────────────────────────────────────────────────────

function IdentityPanel({ identity, onRefresh }: { identity: IdentityInfo; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>(identity.profile);
  const [saving, setSaving] = useState(false);
  const [sigPayload, setSigPayload] = useState('');
  const [sigResult, setSigResult] = useState<{ signature: string; signedAt: string } | null>(null);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await invoke('update_identity_profile', { name: identity.name, profile });
      setEditing(false);
      onRefresh();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const signIt = async () => {
    if (!sigPayload.trim()) return;
    try {
      const result = await invoke<{ signature: string; signedAt: string }>('sign_payload', {
        identityName: identity.name,
        payload: sigPayload,
      });
      setSigResult(result);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Fingerprint size={16} className="text-violet-400 flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] flex-1">{identity.name}</span>
        <div className="flex items-center gap-2 text-xs">
          {identity.discoverable
            ? <span className="flex items-center gap-1 text-green-400"><Globe size={12} /> Discoverable</span>
            : <span className="flex items-center gap-1 text-[var(--text-muted)]"><Lock size={12} /> Private</span>
          }
          <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400">{identity.signingKeyType}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-4">
          {/* DID */}
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Decentralized Identifier (DID)</div>
            <div className="flex items-center gap-2 font-mono text-sm bg-[var(--bg-secondary)] rounded px-3 py-2">
              <span className="text-violet-400 flex-1 break-all">{identity.did}</span>
              <CopyButton text={identity.did} />
            </div>
          </div>

          {/* Domains */}
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Domains</div>
            <div className="flex flex-wrap gap-1.5">
              {identity.domains.map(d => (
                <span key={d} className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs">{d}</span>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Profile</div>
              <button
                onClick={() => setEditing(e => !e)}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <div className="space-y-2">
                {['display_name', 'bio', 'website', 'location'].map(field => (
                  <div key={field}>
                    <label className="text-xs text-[var(--text-muted)] block mb-0.5">{field}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
                      value={profile[field] ?? ''}
                      onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm"
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {Object.entries(identity.profile).length === 0 ? (
                  <div className="text-[var(--text-muted)] text-xs">No profile set — click Edit to add your details.</div>
                ) : Object.entries(identity.profile).map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="text-[var(--text-muted)] w-28 flex-shrink-0">{k}</span>
                    <span className="text-[var(--text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sign / Verify playground */}
          <div className="border-t border-[var(--border)] pt-4">
            <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Sign Payload</div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                placeholder="Text to sign…"
                value={sigPayload}
                onChange={e => setSigPayload(e.target.value)}
              />
              <button
                onClick={signIt}
                className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-sm"
              >
                Sign
              </button>
            </div>
            {sigResult && (
              <div className="rounded bg-[var(--bg-secondary)] p-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">Signature:</span>
                  <code className="text-violet-400 flex-1 break-all">{sigResult.signature}</code>
                  <CopyButton text={sigResult.signature} />
                </div>
                <div className="text-[var(--text-muted)]">Signed at: {fmtTime(sigResult.signedAt)}</div>
              </div>
            )}
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            Created {fmtTime(identity.createdAt)} · {identity.portable ? 'Portable' : 'Non-portable'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feed Panel ───────────────────────────────────────────────────────────────

function FeedPanel({ feed }: { feed: FeedInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [atomXml, setAtomXml] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'entries' | 'xml'>('entries');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ents, xml] = await Promise.all([
        invoke<FeedEntry[]>('get_feed_entries', { name: feed.name, limit: 20 }),
        invoke<string>('generate_feed', { name: feed.name }),
      ]);
      setEntries(ents);
      setAtomXml(xml);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [feed.name]);

  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const subscribeIcon = feed.subscribe === 'open'
    ? <Globe size={12} className="text-green-400" />
    : <Lock size={12} className="text-amber-400" />;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Rss size={16} className="text-orange-400 flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] flex-1">{feed.title}</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-[var(--text-muted)]">
            {subscribeIcon} {feed.subscribe}
          </span>
          {feed.syndicate && <span className="text-green-400">syndicated</span>}
          <span className="text-[var(--text-muted)]">{feed.entryCount} entries</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
            <button
              onClick={() => setView('entries')}
              className={`px-3 py-1 rounded text-xs ${view === 'entries' ? 'bg-indigo-600 text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
            >
              Entries
            </button>
            <button
              onClick={() => setView('xml')}
              className={`px-3 py-1 rounded text-xs ${view === 'xml' ? 'bg-indigo-600 text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
            >
              Atom XML
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={load} className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-muted)]">
                <RefreshCw size={12} />
              </button>
              {view === 'xml' && <CopyButton text={atomXml} />}
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-[var(--text-muted)]">Generating feed…</div>
          ) : view === 'entries' ? (
            <div className="divide-y divide-[var(--border)]">
              {entries.length === 0 ? (
                <div className="p-4 text-sm text-[var(--text-muted)]">
                  No entries yet — run a Reasoner to generate insights that appear in this feed.
                </div>
              ) : entries.map(entry => (
                <div key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{entry.title}</span>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{fmtTime(entry.publishedAt)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-1">{entry.content}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="font-mono">{entry.source}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={10} className="text-green-400" />
                      sig: {entry.signature.slice(3, 11)}…
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all bg-[var(--bg-secondary)] rounded p-3 max-h-96 overflow-y-auto">
                {atomXml || 'No content yet.'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function IdentityView() {
  const [tab, setTab] = useState<'identity' | 'feeds'>('identity');
  const [identities, setIdentities] = useState<IdentityInfo[]>([]);
  const [feeds, setFeeds] = useState<FeedInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ids, fds] = await Promise.all([
        invoke<IdentityInfo[]>('list_identities'),
        invoke<FeedInfo[]>('list_feeds'),
      ]);
      setIdentities(ids);
      setFeeds(fds);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
        <Fingerprint size={20} className="text-violet-400" />
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Identity & Feeds</h1>
        <button onClick={refresh} className="ml-auto p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-5 flex-shrink-0">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'identity' ? 'border-violet-500 text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          onClick={() => setTab('identity')}
        >
          <span className="flex items-center gap-1.5"><User size={14} /> Identity ({identities.length})</span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'feeds' ? 'border-orange-500 text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          onClick={() => setTab('feeds')}
        >
          <span className="flex items-center gap-1.5"><Rss size={14} /> Feeds ({feeds.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] text-sm py-12">Loading…</div>
        ) : tab === 'identity' ? (
          <div className="space-y-4">
            {identities.map(id => (
              <IdentityPanel key={id.name} identity={id} onRefresh={refresh} />
            ))}
            {identities.length === 0 && (
              <div className="text-center py-12">
                <Fingerprint size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <p className="text-[var(--text-muted)] text-sm">No identities declared in .agi source.</p>
              </div>
            )}
            <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text-secondary)] mb-1">About Your Identity</p>
              <p>Your DID is generated locally on first run. It is stored in your app database and never sent anywhere without your consent. Signing uses UUID v5 (SHA-1 keyed) — for production use, configure ed25519 in the IDENTITY declaration.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {feeds.map(feed => (
              <FeedPanel key={feed.name} feed={feed} />
            ))}
            {feeds.length === 0 && (
              <div className="text-center py-12">
                <Rss size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <p className="text-[var(--text-muted)] text-sm">No FEED declarations in .agi source.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
