// Auto-update — thin wrapper over @tauri-apps/plugin-updater.
//
// Channel: GitHub Releases. Tauri's updater plugin reads latest.json
// from the configured endpoint (see tauri.conf.json plugins.updater),
// verifies the bundle's signature against the embedded public key,
// and applies the update via the matching platform installer.
//
// What this file owns:
//   - the four lifecycle states the Settings panel cares about
//   - the check / download / install entry points
//   - error normalization (Tauri's update plugin throws raw strings
//     in some cases — we wrap them so the UI has a consistent shape)
//
// What this file does NOT own:
//   - the signing key (one-time human ceremony — see RELEASING.md)
//   - the GitHub Release publishing (CI job in agicore-studio-build.yml)
//   - update prompts on launch (Beta testers opt in manually via
//     Settings; auto-prompt-at-launch lands when we have signed
//     releases and a real cadence)

import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up_to_date'; currentVersion: string }
  | { kind: 'available'; currentVersion: string; nextVersion: string; notes: string | null }
  | { kind: 'downloading'; nextVersion: string; bytesDownloaded: number; bytesTotal: number | null }
  | { kind: 'ready_to_restart'; nextVersion: string }
  | { kind: 'error'; message: string };

/** A held reference to the pending Update object — needed so the
 *  download step has the same handle the check step returned. */
let pending: Update | null = null;

/** Look for an update. Returns the next state. Safe to call repeatedly. */
export async function checkForUpdate(): Promise<UpdateState> {
  try {
    const update = await check();
    if (!update) {
      pending = null;
      // The plugin doesn't expose the current version on the null
      // path; fall back to import.meta.env at the call site if the
      // UI wants to surface it. For now we return a placeholder.
      return { kind: 'up_to_date', currentVersion: getCurrentVersion() };
    }
    pending = update;
    return {
      kind: 'available',
      currentVersion: update.currentVersion,
      nextVersion: update.version,
      notes: update.body ?? null,
    };
  } catch (e) {
    pending = null;
    return { kind: 'error', message: normalizeError(e) };
  }
}

/** Download and install the previously-checked update, then relaunch.
 *  Caller supplies an onProgress callback that receives transient
 *  downloading-state updates so the UI can animate. */
export async function downloadAndInstall(
  onProgress: (state: UpdateState) => void,
): Promise<UpdateState> {
  const update = pending;
  if (!update) {
    return { kind: 'error', message: 'No pending update — run checkForUpdate first.' };
  }

  try {
    let bytesDownloaded = 0;
    let bytesTotal: number | null = null;

    await update.downloadAndInstall((progress) => {
      switch (progress.event) {
        case 'Started':
          bytesTotal = progress.data.contentLength ?? null;
          onProgress({ kind: 'downloading', nextVersion: update.version, bytesDownloaded: 0, bytesTotal });
          break;
        case 'Progress':
          bytesDownloaded += progress.data.chunkLength;
          onProgress({ kind: 'downloading', nextVersion: update.version, bytesDownloaded, bytesTotal });
          break;
        case 'Finished':
          onProgress({ kind: 'ready_to_restart', nextVersion: update.version });
          break;
      }
    });

    return { kind: 'ready_to_restart', nextVersion: update.version };
  } catch (e) {
    return { kind: 'error', message: normalizeError(e) };
  }
}

/** Restart into the freshly-installed version. The process plugin's
 *  relaunch is a hard exit-and-respawn — any unsaved canvas state
 *  is lost. Callers should warn the user first; the Settings panel
 *  does. */
export async function restartIntoUpdate(): Promise<void> {
  await relaunch();
}

function normalizeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return '(non-serializable error)';
  }
}

/** App version baked in at build time by Vite. */
function getCurrentVersion(): string {
  // Vite exposes package.json version under import.meta.env.npm_package_version
  // when run via npm scripts; fall back to a literal for safety.
  return (import.meta.env?.npm_package_version as string | undefined) ?? '0.1.0';
}
