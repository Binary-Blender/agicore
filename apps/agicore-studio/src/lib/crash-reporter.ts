// Crash reporter — opt-in capture of uncaught errors and unhandled
// promise rejections. Mirrors the telemetry pattern (opt-in flag in
// localStorage, session ring buffer, Settings preview before any
// transmission contract exists).
//
// Captured info is intentionally narrow:
//
//   - error name and message
//   - first N stack frames, with file paths normalized to basenames
//     (no user directory leakage)
//   - timestamp
//
// Not captured: full stacks (path leakage), local-variable contents,
// arguments, anything from the DOM, or the URL bar.

import type { CrashReport } from '../store/crashStore';

export const MAX_REPORTS = 100;
export const MAX_STACK_FRAMES = 12;

let installed = false;

/** Idempotent — safe to call from each window's bootstrap. Returns
 *  true when this call installed the handlers, false if a prior call
 *  already did. The store handles the on/off decision at record time;
 *  installing handlers up-front keeps us from missing the very first
 *  error after the user toggles capture on. */
export function installCrashReporter(): boolean {
  if (installed) return false;
  installed = true;

  window.addEventListener('error', (e) => {
    const err = e.error;
    void record({
      kind: 'error',
      name: err?.name ?? 'Error',
      message: err?.message ?? e.message ?? '(no message)',
      stack: normalizeStack(err?.stack),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    void record({
      kind: 'unhandledrejection',
      name: reason?.name ?? 'UnhandledRejection',
      message: reason?.message ?? String(reason ?? '(no reason)'),
      stack: normalizeStack(reason?.stack),
    });
  });

  return true;
}

/** Strip absolute paths to basenames. Stack traces from Vite-bundled
 *  code leak the developer's home directory; we replace that with the
 *  filename only. Caps to MAX_STACK_FRAMES so a runaway recursion
 *  doesn't fill the buffer with one report. */
export function normalizeStack(stack: string | undefined): string | null {
  if (!stack) return null;
  const lines = stack.split('\n').slice(0, MAX_STACK_FRAMES);
  return lines
    .map((line) => line.replace(/(?:\/|\\)[^\s()]*[\/\\]([^\s()\/\\]+)/g, '/$1'))
    .join('\n');
}

async function record(report: Omit<CrashReport, 'ts'>): Promise<void> {
  // Lazy import keeps this file free of a hard dep on the store, and
  // the store is free to import types from here.
  try {
    const { useCrashStore } = await import('../store/crashStore');
    useCrashStore.getState().record({ ...report, ts: Date.now() });
  } catch {
    // Telemetry must never break the app. Crash-of-crash-reporter
    // would loop forever otherwise.
  }
}

/** Pretty-print the buffer for the Settings preview panel. */
export function previewCrashes(reports: CrashReport[]): string {
  return JSON.stringify(
    reports.map((r) => ({
      ts: new Date(r.ts).toISOString(),
      kind: r.kind,
      name: r.name,
      message: r.message,
      stack: r.stack,
    })),
    null,
    2,
  );
}
