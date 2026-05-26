// Crash store — opt-in flag persisted to localStorage, ring-buffered
// session reports. Same shape as telemetryStore so the Settings UI
// can treat them symmetrically.

import { create } from 'zustand';
import { MAX_REPORTS } from '../lib/crash-reporter';

const ENABLED_STORAGE_KEY = 'agicore-studio.crashes.enabled';

export interface CrashReport {
  ts: number;
  kind: 'error' | 'unhandledrejection';
  name: string;
  message: string;
  stack: string | null;
}

function loadEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveEnabled(v: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_STORAGE_KEY, v ? 'true' : 'false');
  } catch {
    // sandboxed contexts — fall back to in-memory only for this session
  }
}

interface CrashStore {
  enabled: boolean;
  reports: CrashReport[];
  /** Total reports observed this session, including dropped past the cap. */
  totalSeen: number;

  setEnabled: (v: boolean) => void;
  record: (report: CrashReport) => void;
  clear: () => void;
}

export const useCrashStore = create<CrashStore>((set, get) => ({
  enabled: loadEnabled(),
  reports: [],
  totalSeen: 0,

  setEnabled: (v) => {
    saveEnabled(v);
    set({ enabled: v });
  },

  record: (report) => {
    // Always increment totalSeen so the Settings panel can show
    // "captured X (and Y while disabled were not stored)" if we ever
    // want that distinction. Today we just don't record while off.
    if (!get().enabled) return;
    set((s) => {
      const reports = s.reports.length >= MAX_REPORTS
        ? [...s.reports.slice(1), report]
        : [...s.reports, report];
      return { reports, totalSeen: s.totalSeen + 1 };
    });
  },

  clear: () => set({ reports: [], totalSeen: 0 }),
}));
