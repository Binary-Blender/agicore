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
import {
  checkForUpdate,
  downloadAndInstall,
  restartIntoUpdate,
  type UpdateState,
} from '../lib/updater';

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

  const [updateState, setUpdateState] = useState<UpdateState>({ kind: 'idle' });

  const onCheckForUpdate = async () => {
    setUpdateState({ kind: 'checking' });
    const next = await checkForUpdate();
    setUpdateState(next);
  };

  const onInstallUpdate = async () => {
    const next = await downloadAndInstall((s) => setUpdateState(s));
    setUpdateState(next);
  };

  const onRestart = async () => {
    // Hard exit + respawn — the canvas's in-memory state is lost. We
    // don't try to checkpoint here because (a) autosave-on-edit
    // already keeps recovery drafts and (b) installer-restart is a
    // user-initiated action so they expect a clean reboot.
    try {
      await restartIntoUpdate();
    } catch (e) {
      setUpdateState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

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

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
              Updates
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
              Releases are published from GitHub. Signed manifests are
              verified before any install. Currently manual — click
              the button below to check.
            </p>

            <UpdateRow
              state={updateState}
              onCheck={onCheckForUpdate}
              onInstall={onInstallUpdate}
              onRestart={onRestart}
            />
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

/** Small inline component because it would clutter the main render
 *  otherwise. State-driven row with the right button visible per
 *  lifecycle phase. */
const UpdateRow: React.FC<{
  state: UpdateState;
  onCheck: () => void;
  onInstall: () => void;
  onRestart: () => void;
}> = ({ state, onCheck, onInstall, onRestart }) => {
  const btnBase =
    'text-[10px] px-2 py-1 border border-[var(--border)] rounded hover:border-[var(--text-secondary)] text-[var(--text-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  switch (state.kind) {
    case 'idle':
      return (
        <button type="button" onClick={onCheck} className={btnBase}>
          Check for updates
        </button>
      );

    case 'checking':
      return (
        <button type="button" disabled className={btnBase}>
          Checking…
        </button>
      );

    case 'up_to_date':
      return (
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCheck} className={btnBase}>
            Check again
          </button>
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
            v{state.currentVersion} — up to date
          </span>
        </div>
      );

    case 'available':
      return (
        <div className="space-y-2">
          <div className="text-[11px] text-[var(--text-primary)]">
            <span className="font-mono">v{state.currentVersion}</span>{' '}
            <span className="text-[var(--text-muted)]">→</span>{' '}
            <span className="font-mono text-[var(--accent)]">v{state.nextVersion}</span>{' '}
            <span className="text-[var(--text-muted)]">available</span>
          </div>
          {state.notes && (
            <pre className="text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
              {state.notes}
            </pre>
          )}
          <button type="button" onClick={onInstall} className={btnBase}>
            Download and install
          </button>
        </div>
      );

    case 'downloading': {
      const pct = state.bytesTotal
        ? Math.round((state.bytesDownloaded / state.bytesTotal) * 100)
        : null;
      return (
        <div className="space-y-1">
          <div className="text-[11px] text-[var(--text-primary)]">
            Downloading v{state.nextVersion}
            {pct !== null ? ` — ${pct}%` : '…'}
          </div>
          {state.bytesTotal && (
            <div className="h-1 bg-[var(--bg-input)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          )}
        </div>
      );
    }

    case 'ready_to_restart':
      return (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-primary)]">
            v{state.nextVersion} installed. Restart to use it — any
            unsaved canvas state will be lost. (Autosaved drafts will
            recover on next launch.)
          </p>
          <button type="button" onClick={onRestart} className={btnBase}>
            Restart now
          </button>
        </div>
      );

    case 'error':
      return (
        <div className="space-y-2">
          <p className="text-[11px] text-red-400 font-mono">{state.message}</p>
          <button type="button" onClick={onCheck} className={btnBase}>
            Try again
          </button>
        </div>
      );
  }
};

export default SettingsPanel;
