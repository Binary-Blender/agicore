// Settings panel — modal triggered from the title bar cog. Per-provider
// key input, masked by default with an eye toggle to reveal. Save
// writes through to the shared %APPDATA%/Agicore/api-keys.json file
// per OQ-4 — sibling apps see the same keys.

import React, { useEffect, useState } from 'react';
import { PROVIDERS, useSettingsStore, type ProviderId } from '../store/settingsStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { previewBuffer } from '../lib/telemetry';
import { useCrashStore } from '../store/crashStore';
import { previewCrashes } from '../lib/crash-reporter';

interface Props {
  onClose: () => void;
}

const SettingsPanel: React.FC<Props> = ({ onClose }) => {
  const keys = useSettingsStore((s) => s.keys);
  const loaded = useSettingsStore((s) => s.loaded);
  const saving = useSettingsStore((s) => s.saving);
  const error = useSettingsStore((s) => s.error);
  const load = useSettingsStore((s) => s.load);
  const setKey = useSettingsStore((s) => s.setKey);
  const save = useSettingsStore((s) => s.save);

  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const telemetryEnabled = useTelemetryStore((s) => s.enabled);
  const telemetryEvents = useTelemetryStore((s) => s.events);
  const telemetryCounters = useTelemetryStore((s) => s.counters);
  const setTelemetryEnabled = useTelemetryStore((s) => s.setEnabled);
  const clearTelemetry = useTelemetryStore((s) => s.clear);
  const [showPreview, setShowPreview] = useState(false);

  const crashEnabled = useCrashStore((s) => s.enabled);
  const crashReports = useCrashStore((s) => s.reports);
  const setCrashEnabled = useCrashStore((s) => s.setEnabled);
  const clearCrashes = useCrashStore((s) => s.clear);
  const [showCrashPreview, setShowCrashPreview] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const onSave = async () => {
    try {
      await save();
      onClose();
    } catch (e) {
      // Error is surfaced via the store; modal stays open so the user
      // can see what went wrong.
      console.error('settings save failed:', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Settings
            </p>
            <h2 className="text-sm font-semibold mt-0.5">API keys</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-4">
            Stored locally at <code className="font-mono text-[var(--accent)]">%APPDATA%/Agicore/api-keys.json</code>{' '}
            (or the platform equivalent). Shared with sibling Agicore apps —
            you configure once and use everywhere.
          </p>

          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const value = keys[p.id] ?? '';
              const revealed = reveal[p.id] ?? false;
              return (
                <div key={p.id}>
                  <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    {p.label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={revealed ? 'text' : 'password'}
                      value={value}
                      onChange={(e) => setKey(p.id as ProviderId, e.target.value)}
                      placeholder={p.placeholder}
                      className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((r) => ({ ...r, [p.id]: !revealed }))}
                      className="px-2 py-1 text-[10px] border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors"
                    >
                      {revealed ? 'hide' : 'show'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 text-[11px] text-red-400 font-mono">
              {error}
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Telemetry
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Off by default. Records schema-safe usage signals
                  (counts, durations, enum statuses) — never workflow
                  contents, file paths, or model output. Session-only;
                  nothing is transmitted today.
                </p>
              </div>
              <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={telemetryEnabled}
                  onChange={(e) => setTelemetryEnabled(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs">{telemetryEnabled ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-[10px] px-2 py-1 border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors"
              >
                {showPreview ? 'Hide preview' : 'Show me what would be sent'}
              </button>
              <button
                type="button"
                onClick={clearTelemetry}
                disabled={telemetryEvents.length === 0}
                className="text-[10px] px-2 py-1 border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear session
              </button>
              <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">
                {telemetryEvents.length} event{telemetryEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            {showPreview && (
              <div className="mt-3">
                {Object.keys(telemetryCounters).length > 0 && (
                  <div className="mb-2 text-[10px] font-mono text-[var(--text-secondary)] flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(telemetryCounters).map(([name, n]) => (
                      <span key={name}>
                        <span className="text-[var(--accent)]">{name}</span>
                        <span className="text-[var(--text-muted)]">×{n}</span>
                      </span>
                    ))}
                  </div>
                )}
                <pre className="text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
                  {telemetryEvents.length === 0
                    ? '(no events recorded this session)'
                    : previewBuffer(telemetryEvents)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Crash reports
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Off by default. Captures uncaught errors and
                  unhandled promise rejections from the renderer.
                  Stack frames are normalized to basenames so your
                  home directory doesn't leak. Session-only; nothing
                  is transmitted today.
                </p>
              </div>
              <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={crashEnabled}
                  onChange={(e) => setCrashEnabled(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs">{crashEnabled ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCrashPreview((v) => !v)}
                className="text-[10px] px-2 py-1 border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors"
              >
                {showCrashPreview ? 'Hide preview' : 'Show me what would be sent'}
              </button>
              <button
                type="button"
                onClick={clearCrashes}
                disabled={crashReports.length === 0}
                className="text-[10px] px-2 py-1 border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear session
              </button>
              <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">
                {crashReports.length} report{crashReports.length === 1 ? '' : 's'}
              </span>
            </div>

            {showCrashPreview && (
              <pre className="mt-3 text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
                {crashReports.length === 0
                  ? '(no crashes captured this session — that\'s a good sign)'
                  : previewCrashes(crashReports)}
              </pre>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--text-secondary)] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hot)] hover:text-white disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
