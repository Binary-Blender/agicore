// @agicore-protected — Channel + Trigger + PACKET monitoring UI
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Radio, Zap, Package, RefreshCw, Send, Trash2, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelMessage {
  id: string;
  channelName: string;
  packetType?: string;
  payload: string;
  status: string;
  publishedAt: string;
  processedAt?: string;
  validationErrors?: string;
}

interface ChannelSummary {
  name: string;
  totalMessages: number;
  pendingMessages: number;
  rejectedMessages: number;
  lastMessageAt?: string;
}

interface PacketFieldInfo {
  name: string;
  type_: string;
  required: boolean;
}

interface PacketSchemaInfo {
  name: string;
  channel?: string;
  fields: PacketFieldInfo[];
  rules: string[];
  ttlSeconds?: number;
}

interface TriggerStatus {
  name: string;
  description: string;
  whenChannels: string[];
  whenPacket?: string;
  firesKind: string;
  firesTarget: string;
  debounceSecs: number;
  lastFired?: TriggerLogEntry;
}

interface TriggerLogEntry {
  id: string;
  triggerName: string;
  channelName: string;
  messageId: string;
  firesKind: string;
  firesTarget: string;
  status: string;
  firedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtName(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function StatusDot({ status }: { status: string }) {
  if (status === 'pending') return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" title="pending" />;
  if (status === 'processed') return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title="processed" />;
  if (status === 'fired') return <CheckCircle size={14} className="text-green-400" />;
  if (status === 'debounced') return <Clock size={14} className="text-yellow-400" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-400" />;
  return <AlertCircle size={14} className="text-gray-400" />;
}

// ─── Channel Panel ────────────────────────────────────────────────────────────

function ChannelPanel({ summary, onRefresh }: { summary: ChannelSummary; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishPayload, setPublishPayload] = useState('');
  const [packetType, setPacketType] = useState('');
  const [publishing, setPublishing] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await invoke<ChannelMessage[]>('list_channel_messages', {
        channel: summary.name,
        limit: 30,
      });
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [summary.name]);

  useEffect(() => {
    if (expanded) loadMessages();
  }, [expanded, loadMessages]);

  const publish = async () => {
    if (!publishPayload.trim()) return;
    setPublishing(true);
    try {
      await invoke('publish_channel_message', {
        channel: summary.name,
        packetType: packetType || null,
        payload: publishPayload,
        ttlSeconds: null,
      });
      setPublishPayload('');
      setPacketType('');
      await loadMessages();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const clearChannel = async () => {
    if (!confirm(`Clear all messages from ${summary.name}?`)) return;
    await invoke('clear_channel', { channel: summary.name });
    await loadMessages();
    onRefresh();
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Radio size={16} className="text-indigo-400 flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] flex-1">{fmtName(summary.name)}</span>
        <span className="text-xs font-mono text-[var(--text-muted)]">{summary.name}</span>
        <div className="flex items-center gap-3 ml-4">
          {summary.pendingMessages > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
              {summary.pendingMessages} pending
            </span>
          )}
          {summary.rejectedMessages > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
              {summary.rejectedMessages} rejected
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">{summary.totalMessages} total</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
          {/* Publish form */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                placeholder="Payload (JSON or text)"
                value={publishPayload}
                onChange={e => setPublishPayload(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && publish()}
              />
              <input
                type="text"
                className="w-36 px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                placeholder="Packet type"
                value={packetType}
                onChange={e => setPacketType(e.target.value)}
              />
              <button
                onClick={publish}
                disabled={publishing || !publishPayload.trim()}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm flex items-center gap-1.5"
              >
                <Send size={14} />
                Publish
              </button>
              <button
                onClick={clearChannel}
                className="px-3 py-1.5 rounded border border-[var(--border)] hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-400 text-sm"
                title="Clear all messages"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Message list */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[var(--text-muted)] text-sm">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center text-[var(--text-muted)] text-sm">No messages yet</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                  <tr className="text-[var(--text-muted)]">
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Payload</th>
                    <th className="px-4 py-2 text-left font-medium">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => (
                    <>
                      <tr key={msg.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-2">
                          <StatusDot status={msg.status} />
                        </td>
                        <td className="px-4 py-2 text-[var(--text-muted)]">
                          {msg.packetType ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-primary)] font-mono max-w-xs truncate">
                          {msg.payload}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-muted)] whitespace-nowrap">
                          {fmtTime(msg.publishedAt)}
                        </td>
                      </tr>
                      {msg.validationErrors && (
                        <tr key={`${msg.id}-err`} className="bg-red-900/10">
                          <td colSpan={4} className="px-4 py-1.5 text-xs text-red-400">
                            {JSON.parse(msg.validationErrors).join(' · ')}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Trigger Panel ────────────────────────────────────────────────────────────

function TriggerPanel({ trigger }: { trigger: TriggerStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<TriggerLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await invoke<TriggerLogEntry[]>('list_trigger_log', {
        triggerName: trigger.name,
        limit: 20,
      });
      setLog(entries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [trigger.name]);

  useEffect(() => {
    if (expanded) loadLog();
  }, [expanded, loadLog]);

  const debounceLabel = trigger.debounceSecs >= 3600
    ? `${Math.round(trigger.debounceSecs / 3600)}h`
    : trigger.debounceSecs >= 60
    ? `${Math.round(trigger.debounceSecs / 60)}m`
    : `${trigger.debounceSecs}s`;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Zap size={16} className="text-amber-400 flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] flex-1">{fmtName(trigger.name)}</span>
        <div className="flex items-center gap-2 ml-4 text-xs">
          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-mono">
            {trigger.whenChannels.join(', ')}
          </span>
          <span className="text-[var(--text-muted)]">→</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
            {trigger.firesKind}: {trigger.firesTarget}
          </span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            debounce {debounceLabel}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-4">
          <p className="text-sm text-[var(--text-secondary)] mb-3">{trigger.description}</p>
          {trigger.lastFired && (
            <div className="mb-3 text-xs text-[var(--text-muted)]">
              Last fired: <span className="text-[var(--text-secondary)]">{fmtTime(trigger.lastFired.firedAt)}</span>
              {' '}· status: <span className="text-[var(--text-secondary)]">{trigger.lastFired.status}</span>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-[var(--text-muted)]">Loading history…</div>
          ) : log.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">No fires yet — publish a message to a watched channel to trigger this.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)]">
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Channel</th>
                  <th className="pb-2 text-left font-medium">Fired At</th>
                </tr>
              </thead>
              <tbody>
                {log.map(entry => (
                  <tr key={entry.id} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={entry.status} />
                        <span className="text-[var(--text-secondary)]">{entry.status}</span>
                      </div>
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--text-muted)] font-mono">{entry.channelName}</td>
                    <td className="py-1.5 text-[var(--text-muted)]">{fmtTime(entry.firedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ChannelView() {
  const [tab, setTab] = useState<'channels' | 'triggers' | 'schemas'>('channels');
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [triggers, setTriggers] = useState<TriggerStatus[]>([]);
  const [schemas, setSchemas] = useState<PacketSchemaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [chans, trigs, schs] = await Promise.all([
        invoke<ChannelSummary[]>('list_all_channels'),
        invoke<TriggerStatus[]>('list_trigger_statuses'),
        invoke<PacketSchemaInfo[]>('list_packet_schemas'),
      ]);
      setChannels(chans);
      setTriggers(trigs);
      setSchemas(schs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Live updates when messages arrive or triggers fire
    const unlisten1 = listen('channel-message', () => refresh());
    const unlisten2 = listen('trigger-fired', () => refresh());

    return () => {
      unlisten1.then(f => f());
      unlisten2.then(f => f());
    };
  }, [refresh]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
        <Radio size={20} className="text-indigo-400" />
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Channels & Triggers</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-5 flex-shrink-0">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'channels'
              ? 'border-indigo-500 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
          onClick={() => setTab('channels')}
        >
          <span className="flex items-center gap-1.5">
            <Radio size={14} />
            Channels {channels.length > 0 && <span className="text-xs text-[var(--text-muted)]">({channels.length})</span>}
          </span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'triggers'
              ? 'border-amber-500 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
          onClick={() => setTab('triggers')}
        >
          <span className="flex items-center gap-1.5">
            <Zap size={14} />
            Triggers ({triggers.length})
          </span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'schemas'
              ? 'border-green-500 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
          onClick={() => setTab('schemas')}
        >
          <span className="flex items-center gap-1.5">
            <Package size={14} />
            Schemas ({schemas.length})
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] text-sm py-12">Loading…</div>
        ) : tab === 'channels' ? (
          <div className="space-y-3">
            {channels.length === 0 ? (
              <div className="text-center py-12">
                <Radio size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <p className="text-[var(--text-muted)] text-sm">No channel messages yet.</p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Publish to channels like <code className="font-mono">summary_request</code> to trigger AI analysis.
                </p>
              </div>
            ) : (
              channels.map(ch => (
                <ChannelPanel key={ch.name} summary={ch} onRefresh={refresh} />
              ))
            )}
            {/* Quick-start hint */}
            <div className="mt-4 p-4 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text-secondary)] mb-1">Channel Quick-Start</p>
              <p>Publish to <code className="font-mono">summary_request</code> → triggers <strong>conversation_analyzer</strong> reasoner</p>
              <p>Publish to <code className="font-mono">gap_analysis_request</code> → triggers <strong>knowledge_gap_finder</strong> reasoner</p>
              <p>Publish to <code className="font-mono">session_summary_request</code> → triggers <strong>session_summarizer</strong> reasoner</p>
            </div>
          </div>
        ) : tab === 'triggers' ? (
          <div className="space-y-3">
            {triggers.map(t => (
              <TriggerPanel key={t.name} trigger={t} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {schemas.length === 0 ? (
              <div className="text-center py-12">
                <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <p className="text-[var(--text-muted)] text-sm">No PACKET schemas defined.</p>
              </div>
            ) : schemas.map(schema => (
              <div key={schema.name} className="border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)]">
                  <Package size={16} className="text-green-400 flex-shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">{schema.name}</span>
                  {schema.channel && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">
                      {schema.channel}
                    </span>
                  )}
                  {schema.ttlSeconds && (
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      TTL {schema.ttlSeconds >= 3600 ? `${schema.ttlSeconds / 3600}h` : `${schema.ttlSeconds}s`}
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 bg-[var(--bg-primary)]">
                  {/* Fields */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Fields</div>
                    <div className="space-y-1">
                      {schema.fields.map(f => (
                        <div key={f.name} className="flex items-center gap-2 text-sm">
                          <code className="font-mono text-[var(--text-primary)]">{f.name}</code>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">{f.type_}</span>
                          {f.required && <span className="text-xs text-red-400">required</span>}
                        </div>
                      ))}
                      {schema.fields.length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">No typed fields — accepts any JSON</div>
                      )}
                    </div>
                  </div>
                  {/* Validation rules */}
                  {schema.rules.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Validation Rules</div>
                      <div className="space-y-1">
                        {schema.rules.map(rule => (
                          <div key={rule} className="flex items-center gap-2 text-xs">
                            <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                            <code className="font-mono text-[var(--text-secondary)]">{rule}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
